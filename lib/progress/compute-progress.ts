import { eachWeekOfInterval, endOfWeek, format, isWithinInterval, startOfWeek } from "date-fns";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/metrics/engine";
import { computeConstraints } from "@/lib/metrics/constraint";
import { computeHealthScore, type HealthScoreResult } from "@/lib/metrics/health-score";
import type { Metrics } from "@/lib/metrics/types";
import { computeActionValidations, type ActionValidation } from "./action-validation";

/** Weeks start Monday — a "calendar week" per decision D3. */
const WEEK_OPTS = { weekStartsOn: 1 as const };

export type PeriodSnapshot = {
  /** Representative upload for the week (the latest upload landing in that week). */
  uploadId: string;
  filename: string;
  uploadedAt: string;
  metrics: Metrics;
  healthScore: HealthScoreResult;
};

/**
 * One calendar week on the timeline. Periods are continuous from the first
 * upload's week to the latest upload's week; weeks with no upload are gaps
 * (decision D3). `snapshot` is null for gap weeks.
 */
export type ProgressPeriod = {
  weekStart: string; // ISO
  weekEnd: string; // ISO
  weekLabel: string; // e.g. "May 5–11"
  monthLabel: string; // e.g. "May 2026"
  isGap: boolean;
  snapshot: PeriodSnapshot | null;
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
  /** Latest data-bearing period vs the previous data-bearing period. */
  latestVsPrevious: ComparisonDelta | null;
  /** Labels of the two periods being compared (for the comparison header). */
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
  if (periods.every((p) => p.isGap)) return null;

  const dataPeriods = periods.filter((p): p is ProgressPeriod & { snapshot: PeriodSnapshot } =>
    Boolean(p.snapshot),
  );

  let latestVsPrevious: ComparisonDelta | null = null;
  let constraintShift: string | null = null;
  let actionValidations: ActionValidation[] = [];
  let previousLabel: string | null = null;
  let currentLabel: string | null = null;

  if (dataPeriods.length >= 2) {
    const prev = dataPeriods[dataPeriods.length - 2];
    const curr = dataPeriods[dataPeriods.length - 1];
    previousLabel = prev.weekLabel;
    currentLabel = curr.weekLabel;

    latestVsPrevious = diff(prev.snapshot, curr.snapshot);
    constraintShift = detectConstraintShift(prev.snapshot.metrics, curr.snapshot.metrics);
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
 * Bucket uploads into continuous calendar weeks. For each week with uploads, the
 * latest upload represents the week (decision D3). Health-score trend compares
 * each data-bearing period to the previous data-bearing period.
 */
async function buildPeriods(companyId: string, uploads: UploadRow[]): Promise<ProgressPeriod[]> {
  const firstWeekStart = startOfWeek(uploads[0].uploadedAt, WEEK_OPTS);
  const lastWeekStart = startOfWeek(uploads[uploads.length - 1].uploadedAt, WEEK_OPTS);
  const weekStarts = eachWeekOfInterval({ start: firstWeekStart, end: lastWeekStart }, WEEK_OPTS);

  const periods: ProgressPeriod[] = [];
  let previousMetrics: Metrics | null = null;

  for (const weekStart of weekStarts) {
    const weekEnd = endOfWeek(weekStart, WEEK_OPTS);
    const inWeek = uploads.filter((u) =>
      isWithinInterval(u.uploadedAt, { start: weekStart, end: weekEnd }),
    );
    const representative = inWeek.length > 0 ? inWeek[inWeek.length - 1] : null;

    const base = {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      weekLabel: weekLabel(weekStart, weekEnd),
      monthLabel: format(weekStart, "MMM yyyy"),
    };

    if (!representative) {
      periods.push({ ...base, isGap: true, snapshot: null });
      continue;
    }

    const metrics = await computeMetrics({ companyId, uploadId: representative.id });
    if (!metrics) {
      periods.push({ ...base, isGap: true, snapshot: null });
      continue;
    }

    const healthScore = computeHealthScore({ metrics, previousMetrics });
    previousMetrics = metrics;

    periods.push({
      ...base,
      isGap: false,
      snapshot: {
        uploadId: representative.id,
        filename: representative.filename,
        uploadedAt: representative.uploadedAt.toISOString(),
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

/** "May 5–11" within a month; "May 29–Jun 4" across a month boundary. */
function weekLabel(weekStart: Date, weekEnd: Date): string {
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth();
  return sameMonth
    ? `${format(weekStart, "MMM d")}–${format(weekEnd, "d")}`
    : `${format(weekStart, "MMM d")}–${format(weekEnd, "MMM d")}`;
}
