import { Decimal } from "decimal.js";
import { db } from "@/lib/db";
import type { InsightNarrative, MetricJob, Metrics } from "./types";
import { computeProfitPulse } from "./profit-pulse";
import { computeJobHealth } from "./job-health";
import { computeCashFlow } from "./cash-flow";
import { computePmPerformance } from "./pm-performance";
import { computeTopInsights } from "./top-insights";

export const ALL_UPLOADS = "all" as const;

export type ComputeMetricsInput = {
  companyId: string;
  /** Specific upload id, or `"all"` to aggregate every READY upload. Omit for latest. */
  uploadId?: string | typeof ALL_UPLOADS;
};

export async function computeMetrics({
  companyId,
  uploadId,
}: ComputeMetricsInput): Promise<Metrics | null> {
  if (uploadId === ALL_UPLOADS) {
    return computeAllUploadsMetrics(companyId);
  }

  const upload = uploadId
    ? await db.upload.findFirst({ where: { id: uploadId, companyId } })
    : await db.upload.findFirst({
        where: { companyId, status: "READY" },
        orderBy: { uploadedAt: "desc" },
      });

  if (!upload) return null;

  const jobs = await loadJobsForMetrics({ companyId, uploadIds: [upload.id] });
  const targetMarginFraction = Number(upload.targetMargin.toString());

  const metrics = computeFromJobs(jobs, targetMarginFraction);

  // Merge AI-generated narrative persisted at import time (if any) — never triggers a call.
  const narrativeMap = parseNarrativeMap(
    (upload as typeof upload & { insightsNarrative?: unknown }).insightsNarrative,
  );
  if (narrativeMap) {
    metrics.topInsights = applyNarratives(metrics, narrativeMap);
  }

  return metrics;
}

/**
 * Aggregate across every READY upload for a company.
 * Target margin = latest upload's target (simplest sensible default).
 * Narrative sourced from Company.allInsightsNarrative — never triggers a call on read.
 */
async function computeAllUploadsMetrics(companyId: string): Promise<Metrics | null> {
  const uploads = await db.upload.findMany({
    where: { companyId, status: "READY" },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, targetMargin: true },
  });

  if (uploads.length === 0) return null;

  const targetMarginFraction = Number(uploads[0].targetMargin.toString());
  const jobs = await loadJobsForMetrics({
    companyId,
    uploadIds: uploads.map((u) => u.id),
  });

  if (jobs.length === 0) return null;

  const metrics = computeFromJobs(jobs, targetMarginFraction);

  const company = await db.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (company) {
    // Read the cached aggregate narrative. Field added in migration 20260421130000.
    const companyWithNarrative = (await db.company.findUnique({
      where: { id: companyId },
    })) as ({ allInsightsNarrative?: unknown } & { id: string }) | null;
    const narrativeMap = parseNarrativeMap(companyWithNarrative?.allInsightsNarrative);
    if (narrativeMap) {
      metrics.topInsights = applyNarratives(metrics, narrativeMap);
    }
  }

  return metrics;
}

async function loadJobsForMetrics({
  companyId,
  uploadIds,
}: {
  companyId: string;
  uploadIds: string[];
}): Promise<MetricJob[]> {
  const rawJobs = await db.job.findMany({
    where: { companyId, uploadId: { in: uploadIds } },
    select: {
      jobId: true,
      invoiceAmount: true,
      jobCost: true,
      cashReceived: true,
      balanceDue: true,
      projectType: true,
      projectManager: true,
      arBucket: true,
      startDate: true,
      finishDate: true,
    },
  });

  return rawJobs.map((j) => ({
    jobId: j.jobId,
    invoiceAmount: new Decimal(j.invoiceAmount.toString()),
    jobCost: new Decimal(j.jobCost.toString()),
    cashReceived: new Decimal(j.cashReceived.toString()),
    balanceDue: new Decimal(j.balanceDue.toString()),
    projectType: j.projectType,
    projectManager: j.projectManager,
    arBucket: j.arBucket,
    startDate: j.startDate,
    finishDate: j.finishDate,
  }));
}

function applyNarratives(metrics: Metrics, narrativeMap: Record<string, InsightNarrative>) {
  return {
    items: metrics.topInsights.items.map((item) => ({
      ...item,
      narrative: narrativeMap[item.id] ?? null,
    })),
  };
}

function parseNarrativeMap(raw: unknown): Record<string, InsightNarrative> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const entries = Object.entries(raw as Record<string, unknown>);
  const out: Record<string, InsightNarrative> = {};
  for (const [id, value] of entries) {
    if (!value || typeof value !== "object") continue;
    const v = value as { explanation?: unknown; rootCause?: unknown; recommendations?: unknown };
    if (typeof v.explanation !== "string" || v.explanation.length === 0) continue;
    if (typeof v.rootCause !== "string" || v.rootCause.length === 0) continue;
    if (!Array.isArray(v.recommendations)) continue;
    const recs = v.recommendations.filter((r): r is string => typeof r === "string");
    if (recs.length === 0) continue;
    out[id] = {
      explanation: v.explanation,
      rootCause: v.rootCause,
      recommendations: recs,
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function computeFromJobs(jobs: MetricJob[], targetMarginFraction: number): Metrics {
  const profitPulse = computeProfitPulse(jobs);
  const jobHealth = computeJobHealth({ jobs, targetMarginFraction });
  const cashFlow = computeCashFlow(jobs);
  const pmPerformance = computePmPerformance(jobs);
  const topInsights = computeTopInsights({
    jobs,
    targetMarginFraction,
    jobHealth,
    pmPerformance,
  });

  return {
    profitPulse,
    jobHealth,
    cashFlow,
    pmPerformance,
    topInsights,
  };
}
