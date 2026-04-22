import { Decimal } from "decimal.js";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/metrics/engine";
import { marginPercent, sum, toMoneyString } from "@/lib/metrics/helpers";
import type { Metrics, MetricJob, MoneyString } from "@/lib/metrics/types";
import type { QuestionKey } from "./questions";

const UNASSIGNED_PM = "Unassigned";
const UNKNOWN_TYPE = "unknown";

export type LostMoneyStats = {
  totalJobs: number;
  unprofitableJobs: number;
  totalLoss: MoneyString;
  avgLoss: MoneyString;
  byJobType: Array<{ projectType: string; count: number; loss: MoneyString }>;
  byPm: Array<{ pm: string; count: number; loss: MoneyString }>;
};

export type BestPmStats = {
  companyAvgMarginPct: number;
  rows: Array<{
    pm: string;
    marginPct: number;
    variancePct: number;
    revenue: MoneyString;
    jobCount: number;
  }>;
};

export type MarginHurtStats = {
  targetMarginPct: number;
  companyAvgMarginPct: number;
  belowTargetCount: number;
  totalEstimatedImpact: MoneyString;
  drags: Array<{
    dimension: "jobType" | "pm" | "ar";
    label: string;
    impact: MoneyString;
    marginPct: number | null;
    jobCount: number | null;
  }>;
};

export type OverviewStats = {
  uploadFilename: string;
  targetMarginPct: number;
  profitPulse: Metrics["profitPulse"];
  jobHealth: Metrics["jobHealth"];
  cashFlow: Metrics["cashFlow"];
  pmPerformance: Metrics["pmPerformance"];
  topInsights: Metrics["topInsights"];
  lostMoney: LostMoneyStats;
};

export type StatsResult =
  | { questionKey: "LOST_MONEY"; stats: LostMoneyStats }
  | { questionKey: "BEST_PM"; stats: BestPmStats }
  | { questionKey: "MARGIN_HURT"; stats: MarginHurtStats };

export type ComputeStatsInput = {
  companyId: string;
  uploadId?: string;
};

export async function computeStats(
  questionKey: QuestionKey,
  input: ComputeStatsInput,
): Promise<{ result: StatsResult; sqlRan: string; uploadId: string } | null> {
  const upload = await resolveUpload(input);
  if (!upload) return null;

  const jobs = await loadJobs(input.companyId, upload.id);
  const metrics = await computeMetrics({ companyId: input.companyId, uploadId: upload.id });
  if (!metrics) return null;

  switch (questionKey) {
    case "LOST_MONEY":
      return {
        uploadId: upload.id,
        sqlRan:
          "Job WHERE companyId AND uploadId GROUP BY projectType, projectManager (aggregated)",
        result: { questionKey, stats: aggregateLostMoney(jobs) },
      };
    case "BEST_PM":
      return {
        uploadId: upload.id,
        sqlRan: "Job WHERE companyId AND uploadId GROUP BY projectManager (pm-performance)",
        result: { questionKey, stats: aggregateBestPm(metrics) },
      };
    case "MARGIN_HURT":
      return {
        uploadId: upload.id,
        sqlRan: "Job WHERE companyId AND uploadId, top-insights rules applied",
        result: { questionKey, stats: aggregateMarginHurt(metrics) },
      };
  }
}

export async function computeOverview(
  input: ComputeStatsInput,
): Promise<{ result: OverviewStats; sqlRan: string; uploadId: string } | null> {
  const upload = await resolveUpload(input);
  if (!upload) return null;

  const jobs = await loadJobs(input.companyId, upload.id);
  const metrics = await computeMetrics({ companyId: input.companyId, uploadId: upload.id });
  if (!metrics) return null;

  return {
    uploadId: upload.id,
    sqlRan:
      "Aggregated overview: profit pulse + job health + cash flow + pm performance + top insights + lost-money rollups",
    result: {
      uploadFilename: upload.filename,
      targetMarginPct: metrics.jobHealth.targetMarginPct,
      profitPulse: metrics.profitPulse,
      jobHealth: metrics.jobHealth,
      cashFlow: metrics.cashFlow,
      pmPerformance: metrics.pmPerformance,
      topInsights: metrics.topInsights,
      lostMoney: aggregateLostMoney(jobs),
    },
  };
}

async function resolveUpload(input: ComputeStatsInput) {
  return input.uploadId
    ? db.upload.findFirst({ where: { id: input.uploadId, companyId: input.companyId } })
    : db.upload.findFirst({
        where: { companyId: input.companyId, status: "READY" },
        orderBy: { uploadedAt: "desc" },
      });
}

async function loadJobs(companyId: string, uploadId: string): Promise<MetricJob[]> {
  const rows = await db.job.findMany({
    where: { companyId, uploadId },
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
  return rows.map((j) => ({
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

function aggregateLostMoney(jobs: MetricJob[]): LostMoneyStats {
  const unprofitable = jobs.filter((j) => j.invoiceAmount.minus(j.jobCost).lt(0));
  const totalLoss = unprofitable.reduce(
    (acc, j) => acc.plus(j.jobCost.minus(j.invoiceAmount)),
    new Decimal(0),
  );
  const avgLoss = unprofitable.length === 0 ? new Decimal(0) : totalLoss.div(unprofitable.length);

  const byType = new Map<string, { count: number; loss: Decimal }>();
  const byPm = new Map<string, { count: number; loss: Decimal }>();

  for (const job of unprofitable) {
    const loss = job.jobCost.minus(job.invoiceAmount);
    const typeKey = job.projectType ?? UNKNOWN_TYPE;
    const pmKey = job.projectManager?.trim() || UNASSIGNED_PM;
    const typeEntry = byType.get(typeKey) ?? { count: 0, loss: new Decimal(0) };
    typeEntry.count += 1;
    typeEntry.loss = typeEntry.loss.plus(loss);
    byType.set(typeKey, typeEntry);
    const pmEntry = byPm.get(pmKey) ?? { count: 0, loss: new Decimal(0) };
    pmEntry.count += 1;
    pmEntry.loss = pmEntry.loss.plus(loss);
    byPm.set(pmKey, pmEntry);
  }

  return {
    totalJobs: jobs.length,
    unprofitableJobs: unprofitable.length,
    totalLoss: toMoneyString(totalLoss),
    avgLoss: toMoneyString(avgLoss),
    byJobType: Array.from(byType.entries())
      .map(([projectType, v]) => ({
        projectType,
        count: v.count,
        loss: toMoneyString(v.loss),
      }))
      .sort((a, b) => Number(b.loss) - Number(a.loss)),
    byPm: Array.from(byPm.entries())
      .map(([pm, v]) => ({ pm, count: v.count, loss: toMoneyString(v.loss) }))
      .sort((a, b) => Number(b.loss) - Number(a.loss)),
  };
}

function aggregateBestPm(metrics: Metrics): BestPmStats {
  return {
    companyAvgMarginPct: metrics.pmPerformance.companyAvgMarginPct,
    rows: metrics.pmPerformance.rows
      .slice()
      .sort((a, b) => b.marginPct - a.marginPct)
      .map((row) => ({
        pm: row.pm,
        marginPct: row.marginPct,
        variancePct: row.variancePct,
        revenue: row.revenue,
        jobCount: row.jobCount,
      })),
  };
}

function aggregateMarginHurt(metrics: Metrics): MarginHurtStats {
  const items = metrics.topInsights.items;
  const totalImpact = items.reduce(
    (acc, i) => acc.plus(new Decimal(i.estimatedImpact)),
    new Decimal(0),
  );
  const drags = items.map((i) => ({
    dimension: i.dimension,
    label: i.title,
    impact: i.estimatedImpact,
    marginPct: null,
    jobCount: null,
  }));
  return {
    targetMarginPct: metrics.jobHealth.targetMarginPct,
    companyAvgMarginPct: metrics.profitPulse.grossMarginPct,
    belowTargetCount: metrics.jobHealth.lowMarginJobCount,
    totalEstimatedImpact: toMoneyString(totalImpact),
    drags,
  };
}

export const _internals = { aggregateLostMoney, aggregateBestPm, aggregateMarginHurt };
export { sum, marginPercent };
