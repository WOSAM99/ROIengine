import { format } from "date-fns";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/metrics/engine";
import { computeConstraints } from "@/lib/metrics/constraint";
import { computeHealthScore, type HealthScoreResult } from "@/lib/metrics/health-score";
import type { Metrics } from "@/lib/metrics/types";
import { ensureScopeNarrative } from "@/lib/insights/ensure-narrative";
import { computeActionValidations, type ActionValidation } from "./action-validation";

export type PeriodSnapshot = {
  uploadId: string;
  filename: string;
  uploadedAt: string;
  metrics: Metrics;
  healthScore: HealthScoreResult;
};

/**
 * One uploaded sheet on the timeline (decision D3-rev, 2026-05-27). Every READY
 * upload that yields computable metrics is its own data point — no calendar-week
 * bucketing and no "latest upload per week" collapsing. Progress is tracked
 * sheet-by-sheet, in upload order.
 */
export type ProgressPeriod = {
  /** Compact label for the chart x-axis, e.g. "May 12". */
  label: string;
  /** Month bucket header for the table, e.g. "May 2026". */
  monthLabel: string;
  snapshot: PeriodSnapshot;
};

export type ComparisonDelta = {
  grossMarginPct: number;
  arOver30: number;
  cashCollected: number;
  totalRevenue: number;
  revenuePerJob: number;
  healthScore: number;
};

export type ProgressTimeline = {
  periods: ProgressPeriod[];
  /** Latest uploaded sheet vs the previous uploaded sheet. */
  latestVsPrevious: ComparisonDelta | null;
  /** Labels of the two sheets being compared (for the comparison header). */
  previousLabel: string | null;
  currentLabel: string | null;
  constraintShift: string | null;
  actionValidations: ActionValidation[];
};

type UploadRow = { id: string; filename: string; uploadedAt: Date };

export async function computeProgress(companyId: string): Promise<ProgressTimeline | null> {
  const uploads = await db.upload.findMany({
    where: { companyId, status: "READY" },
    orderBy: { uploadedAt: "asc" },
    select: { id: true, filename: true, uploadedAt: true },
  });

  if (uploads.length === 0) return null;

  const periods = await buildPeriods(companyId, uploads);
  if (periods.length === 0) return null;

  let latestVsPrevious: ComparisonDelta | null = null;
  let constraintShift: string | null = null;
  let actionValidations: ActionValidation[] = [];
  let previousLabel: string | null = null;
  let currentLabel: string | null = null;

  if (periods.length >= 2) {
    const prev = periods[periods.length - 2];
    const curr = periods[periods.length - 1];
    previousLabel = prev.snapshot.filename;
    currentLabel = curr.snapshot.filename;

    latestVsPrevious = diff(prev.snapshot, curr.snapshot);
    constraintShift = detectConstraintShift(prev.snapshot.metrics, curr.snapshot.metrics);

    // Backfill AI narratives for the two compared sheets if they predate the
    // narrative feature (stored value is NULL). One-shot per upload; no-op when
    // already present (new files generate at import) or no API key. MUST run
    // before computeActionValidations, which reads prev's stored __weekly__
    // priorities. See lib/insights/ensure-narrative.ts for the never-re-call guards.
    await ensureScopeNarrative({ companyId, uploadId: prev.snapshot.uploadId });
    await ensureScopeNarrative({ companyId, uploadId: curr.snapshot.uploadId });

    actionValidations = await computeActionValidations({
      previousUploadId: prev.snapshot.uploadId,
      previousMetrics: prev.snapshot.metrics,
      currentMetrics: curr.snapshot.metrics,
    });
  }

  return {
    periods,
    latestVsPrevious,
    previousLabel,
    currentLabel,
    constraintShift,
    actionValidations,
  };
}

/**
 * One period per uploaded sheet, in upload order. Health-score trend compares
 * each sheet to the previous sheet. Uploads that yield no computable metrics
 * (e.g. zero valid jobs) are skipped rather than shown as empty rows.
 */
async function buildPeriods(companyId: string, uploads: UploadRow[]): Promise<ProgressPeriod[]> {
  const periods: ProgressPeriod[] = [];
  let previousMetrics: Metrics | null = null;

  for (const upload of uploads) {
    const metrics = await computeMetrics({ companyId, uploadId: upload.id });
    if (!metrics) continue;

    const healthScore = computeHealthScore({ metrics, previousMetrics });
    previousMetrics = metrics;

    periods.push({
      label: format(upload.uploadedAt, "MMM d"),
      monthLabel: format(upload.uploadedAt, "MMM yyyy"),
      snapshot: {
        uploadId: upload.id,
        filename: upload.filename,
        uploadedAt: upload.uploadedAt.toISOString(),
        metrics,
        healthScore,
      },
    });
  }

  return periods;
}

function diff(prev: PeriodSnapshot, curr: PeriodSnapshot): ComparisonDelta {
  return {
    grossMarginPct: curr.metrics.jobHealth.avgMarginPct - prev.metrics.jobHealth.avgMarginPct,
    arOver30: Number(curr.metrics.cashFlow.arOver30) - Number(prev.metrics.cashFlow.arOver30),
    cashCollected:
      Number(curr.metrics.cashFlow.cashCollected) - Number(prev.metrics.cashFlow.cashCollected),
    totalRevenue:
      Number(curr.metrics.profitPulse.totalRevenue) - Number(prev.metrics.profitPulse.totalRevenue),
    revenuePerJob:
      Number(curr.metrics.profitPulse.revenuePerJob) -
      Number(prev.metrics.profitPulse.revenuePerJob),
    healthScore: curr.healthScore.total - prev.healthScore.total,
  };
}

function detectConstraintShift(prev: Metrics, curr: Metrics): string | null {
  const { primary: prevPrimary } = computeConstraints(prev);
  const { primary: currPrimary } = computeConstraints(curr);
  if (prevPrimary && currPrimary && prevPrimary.constraintType !== currPrimary.constraintType) {
    return `${prevPrimary.title} improved. ${currPrimary.title} is now the primary constraint.`;
  }
  return null;
}
