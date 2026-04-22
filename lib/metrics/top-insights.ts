import { Decimal } from "decimal.js";
import type {
  Insight,
  InsightSeverity,
  JobHealth,
  MetricJob,
  PmPerformance,
  TopInsights,
} from "./types";
import { ZERO } from "./helpers";

export type TopInsightsInput = {
  jobs: MetricJob[];
  targetMarginFraction: number;
  jobHealth: JobHealth;
  pmPerformance: PmPerformance;
};

const OVERDUE_BUCKETS = new Set(["31-60", "61-90", ">90"]);
const INSIGHT_LIMIT = 5; // surface up to 5 (was 3); widget renders them all, hero is #1.

type Candidate = Insight & {
  /** Raw impact in currency for sorting. */
  impact: Decimal;
  /** Urgency multiplier applied AFTER impact to bias cash-flow / critical leaks upward. */
  urgencyWeight: number;
};

/** Compact currency for prose (£12.3K / $1.2M / £850). Accepts Decimal, number, or a MoneyString. */
function prettyMoney(value: Decimal | number | string, currency = "$"): string {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number(value.toString());
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${currency}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${currency}${Math.round(abs / 1_000)}K`;
  if (abs >= 1_000) return `${sign}${currency}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${currency}${Math.round(abs)}`;
}

function severityForJobType(deficitPts: number, impactShareOfRevenue: number): InsightSeverity {
  if (impactShareOfRevenue >= 0.15 || deficitPts >= 15) return "critical";
  if (impactShareOfRevenue >= 0.05 || deficitPts >= 8) return "high";
  return "medium";
}

function severityForPm(
  variancePts: number,
  impact: Decimal,
  totalRevenue: Decimal,
): InsightSeverity {
  const share = totalRevenue.isZero() ? 0 : Number(impact.div(totalRevenue).toString());
  if (share >= 0.1 || variancePts >= 12) return "critical";
  if (share >= 0.04 || variancePts >= 6) return "high";
  return "medium";
}

function severityForAr(
  worstBucket: string | null,
  arTotal: Decimal,
  billed: Decimal,
): InsightSeverity {
  const share = billed.isZero() ? 0 : Number(arTotal.div(billed).toString());
  if (worstBucket === ">90") return "critical";
  if (worstBucket === "61-90" || share >= 0.25) return "critical";
  if (share >= 0.12) return "high";
  return "medium";
}

const URGENCY: Record<InsightSeverity, number> = {
  critical: 1.5,
  high: 1.15,
  medium: 1,
};

export function computeTopInsights({
  jobs,
  targetMarginFraction,
  jobHealth,
  pmPerformance,
}: TopInsightsInput): TopInsights {
  const candidates: Candidate[] = [];

  const totalRevenue = jobs.reduce((acc, j) => acc.plus(j.invoiceAmount), ZERO);
  const totalBilled = totalRevenue; // Alias for readability in A/R math.
  const targetPct = targetMarginFraction * 100;

  // -------------------------------------------------------------------------
  // Rule 1: Margin Leakage by Job Type — (targetMargin − actual) × revenue
  // -------------------------------------------------------------------------
  for (const row of jobHealth.rows) {
    if (row.marginPct >= targetPct) continue;
    const revenue = new Decimal(row.revenue);
    const deficitPts = targetPct - row.marginPct;
    const impact = revenue.times(deficitPts / 100);
    if (impact.lte(0)) continue;

    const share = totalRevenue.isZero() ? 0 : Number(impact.div(totalRevenue).toString());
    const severity = severityForJobType(deficitPts, share);
    const typeLabel = row.projectType === "unknown" ? "Unknown-type" : row.projectType;

    candidates.push({
      id: `type:${row.projectType}`,
      dimension: "jobType",
      severity,
      title: `${capitalize(typeLabel)} jobs losing ${prettyMoney(impact)} of margin`,
      rule: `${deficitPts.toFixed(1)} pts below your ${Math.round(targetPct)}% target (running at ${row.marginPct.toFixed(1)}%)`,
      detail: `Across ${row.jobCount} ${row.jobCount === 1 ? "job" : "jobs"} that billed ${prettyMoney(row.revenue)}. Getting this work to target recovers ${prettyMoney(impact)}.`,
      estimatedImpact: impact.toDecimalPlaces(2).toString(),
      impact,
      urgencyWeight: URGENCY[severity],
    });
  }

  // -------------------------------------------------------------------------
  // Rule 2: PM Variance — (companyAvg − pmMargin) × pmRevenue
  // -------------------------------------------------------------------------
  for (const row of pmPerformance.rows) {
    if (row.marginPct >= pmPerformance.companyAvgMarginPct) continue;
    const revenue = new Decimal(row.revenue);
    const variancePts = pmPerformance.companyAvgMarginPct - row.marginPct;
    const impact = revenue.times(variancePts / 100);
    if (impact.lte(0)) continue;

    const severity = severityForPm(variancePts, impact, totalRevenue);

    candidates.push({
      id: `pm:${row.pm}`,
      dimension: "pm",
      severity,
      title: `${row.pm} running ${variancePts.toFixed(1)} pts under company margin`,
      rule: `PM margin ${row.marginPct.toFixed(1)}% vs company ${pmPerformance.companyAvgMarginPct.toFixed(1)}%`,
      detail: `Owns ${row.jobCount} ${row.jobCount === 1 ? "job" : "jobs"} worth ${prettyMoney(row.revenue)}. Bringing this PM's book to the company average recovers ${prettyMoney(impact)}.`,
      estimatedImpact: impact.toDecimalPlaces(2).toString(),
      impact,
      urgencyWeight: URGENCY[severity],
    });
  }

  // -------------------------------------------------------------------------
  // Rule 3: Cash Flow Delay — sum(balanceDue WHERE bucket > 30 days)
  // -------------------------------------------------------------------------
  const overdueJobs = jobs.filter(
    (j) => j.arBucket && OVERDUE_BUCKETS.has(j.arBucket) && j.balanceDue.gt(0),
  );
  if (overdueJobs.length > 0) {
    const arImpact = overdueJobs.reduce((acc, j) => acc.plus(j.balanceDue), ZERO);
    const worstBucket = pickWorstBucket(overdueJobs.map((j) => j.arBucket ?? ""));
    const severity = severityForAr(worstBucket, arImpact, totalBilled);

    const bucketBreakdown = bucketCounts(overdueJobs);
    const breakdownText = formatBucketBreakdown(bucketBreakdown);

    candidates.push({
      id: "ar:overdue",
      dimension: "ar",
      severity,
      title: `${prettyMoney(arImpact)} stuck in invoices aged past 30 days`,
      rule:
        worstBucket === ">90"
          ? `Worst bucket: 90+ days — highest write-off risk`
          : worstBucket === "61-90"
            ? `Worst bucket: 61-90 days — escalate before it ages further`
            : `Worst bucket: 31-60 days — recoverable with a focused collection push`,
      detail: `${overdueJobs.length} invoices overdue${breakdownText ? ` (${breakdownText})` : ""}. That's cash you've earned but not collected.`,
      estimatedImpact: arImpact.toDecimalPlaces(2).toString(),
      impact: arImpact,
      urgencyWeight: URGENCY[severity],
    });
  }

  // Rank by (impact × urgency) — cash-flow and critical-severity leaks bubble up.
  candidates.sort((a, b) => {
    const aScore = Number(a.impact.toString()) * a.urgencyWeight;
    const bScore = Number(b.impact.toString()) * b.urgencyWeight;
    return bScore - aScore;
  });

  const items: Insight[] = candidates.slice(0, INSIGHT_LIMIT).map((c) => ({
    id: c.id,
    title: c.title,
    dimension: c.dimension,
    severity: c.severity,
    rule: c.rule,
    estimatedImpact: c.estimatedImpact,
    detail: c.detail,
  }));

  return { items };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pickWorstBucket(buckets: string[]): string | null {
  const order = [">90", "61-90", "31-60"];
  for (const tier of order) {
    if (buckets.includes(tier)) return tier;
  }
  return null;
}

function bucketCounts(rows: MetricJob[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of rows) {
    const b = r.arBucket ?? "unknown";
    counts[b] = (counts[b] ?? 0) + 1;
  }
  return counts;
}

function formatBucketBreakdown(counts: Record<string, number>): string {
  const parts: string[] = [];
  const order = [">90", "61-90", "31-60"];
  for (const tier of order) {
    if (counts[tier]) parts.push(`${counts[tier]} past ${tier} days`);
  }
  return parts.join(", ");
}
