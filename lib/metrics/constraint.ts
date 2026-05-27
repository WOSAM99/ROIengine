import { formatMoney, formatPct } from "@/lib/format";
import type {
  CashFlow,
  ConstraintType,
  ExecutivePriority,
  ExecutivePriorityKpi,
  JobHealth,
  Metrics,
  PmPerformance,
  ProfitPulse,
  WeeklyPriorities,
  WeeklyPriority,
  WeeklyPriorityStatus,
} from "./types";

const URGENCY: Record<ConstraintType, number> = {
  ar_aging: 1.5,
  negative_job_type: 1.4,
  gross_margin: 1.2,
  pm_variance: 1.1,
  cash_efficiency: 1.0,
};

const MIN_IMPACT = 1000;

type ScoredConstraint = {
  constraintType: ConstraintType;
  title: string;
  kpis: ExecutivePriorityKpi[];
  financialImpact: number;
  score: number;
};

export function computeConstraints(metrics: Metrics): {
  primary: ExecutivePriority | null;
  weeklyPriorities: WeeklyPriorities;
} {
  const candidates: ScoredConstraint[] = [];

  scoreArAging(metrics.cashFlow, candidates);
  scoreGrossMargin(metrics.jobHealth, metrics.profitPulse, candidates);
  scoreNegativeJobTypes(metrics.jobHealth, candidates);
  scoreCashEfficiency(metrics.cashFlow, candidates);
  scorePmVariance(metrics.pmPerformance, candidates);

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return { primary: null, weeklyPriorities: { items: [] } };
  }

  const primary: ExecutivePriority = {
    constraintType: candidates[0].constraintType,
    title: candidates[0].title,
    kpis: candidates[0].kpis,
    score: candidates[0].score,
    directive: null,
    whyItMatters: null,
    howToExecute: null,
  };

  const weeklyItems: WeeklyPriority[] = candidates.slice(0, 5).map((c, i) => ({
    id: `weekly:${c.constraintType}:${i}`,
    constraintType: c.constraintType,
    status: scoreToStatus(c.score),
    estimatedImpact: String(Math.round(c.financialImpact)),
    title: null,
    reason: null,
    expectedOutcome: null,
    actions: null,
  }));

  return { primary, weeklyPriorities: { items: weeklyItems } };
}

function scoreArAging(cashFlow: CashFlow, candidates: ScoredConstraint[]): void {
  const financialImpact = Number(cashFlow.arOver30);
  if (financialImpact < MIN_IMPACT) return;

  const overdueCount = cashFlow.buckets
    .filter((b) => !["Current", "1-30"].includes(b.bucket))
    .reduce((sum, b) => sum + b.count, 0);

  const worstBucket = getWorstBucket(cashFlow.buckets);

  const kpis: ExecutivePriorityKpi[] = [
    { label: "Overdue invoices", value: String(overdueCount), tone: "danger" },
    { label: "Highest risk bucket", value: worstBucket, tone: "danger" },
    { label: "Recoverable", value: formatMoney(cashFlow.arOver30), tone: "warning" },
    { label: "A/R risk", value: formatPct(cashFlow.arRiskPct), tone: "warning" },
  ];

  candidates.push({
    constraintType: "ar_aging",
    title: `${formatMoney(cashFlow.arOver30)} stuck in invoices over 30 days`,
    kpis,
    financialImpact,
    score: financialImpact * URGENCY.ar_aging,
  });
}

function scoreGrossMargin(
  jobHealth: JobHealth,
  profitPulse: ProfitPulse,
  candidates: ScoredConstraint[],
): void {
  if (jobHealth.avgMarginPct >= jobHealth.targetMarginPct) return;

  const deficitPts = jobHealth.targetMarginPct - jobHealth.avgMarginPct;
  const financialImpact = Number(profitPulse.totalRevenue) * (deficitPts / 100);
  if (financialImpact < MIN_IMPACT) return;

  const kpis: ExecutivePriorityKpi[] = [
    { label: "Avg margin", value: formatPct(jobHealth.avgMarginPct), tone: "warning" },
    { label: "Target margin", value: formatPct(jobHealth.targetMarginPct), tone: "accent" },
    { label: "Gap", value: `${deficitPts.toFixed(1)} pts`, tone: "danger" },
    { label: "Below-target jobs", value: String(jobHealth.lowMarginJobCount), tone: "warning" },
  ];

  candidates.push({
    constraintType: "gross_margin",
    title: `Gross margin ${formatPct(jobHealth.avgMarginPct)} is ${deficitPts.toFixed(1)} pts below ${formatPct(jobHealth.targetMarginPct, 0)} target`,
    kpis,
    financialImpact,
    score: financialImpact * URGENCY.gross_margin,
  });
}

function scoreNegativeJobTypes(jobHealth: JobHealth, candidates: ScoredConstraint[]): void {
  let worst: ScoredConstraint | null = null;

  for (const row of jobHealth.rows) {
    if (row.marginPct >= 0) continue;
    const financialImpact = Math.abs(Number(row.revenue) * (row.marginPct / 100));
    if (financialImpact < MIN_IMPACT) continue;

    const score = financialImpact * URGENCY.negative_job_type;
    if (!worst || score > worst.score) {
      const kpis: ExecutivePriorityKpi[] = [
        { label: "Job type", value: capitalize(row.projectType), tone: "danger" },
        { label: "Margin", value: formatPct(row.marginPct), tone: "danger" },
        { label: "Revenue at risk", value: formatMoney(row.revenue), tone: "warning" },
        { label: "Job count", value: String(row.jobCount), tone: "slate" },
      ];

      worst = {
        constraintType: "negative_job_type",
        title: `${capitalize(row.projectType)} jobs running at ${formatPct(row.marginPct)} margin (net loss)`,
        kpis,
        financialImpact,
        score,
      };
    }
  }

  if (worst) candidates.push(worst);
}

function scoreCashEfficiency(cashFlow: CashFlow, candidates: ScoredConstraint[]): void {
  if (cashFlow.collectionEfficiencyPct >= 80) return;

  const gap = 80 - cashFlow.collectionEfficiencyPct;
  const financialImpact = Number(cashFlow.outstanding) * (gap / 100);
  if (financialImpact < MIN_IMPACT) return;

  const kpis: ExecutivePriorityKpi[] = [
    {
      label: "Collection efficiency",
      value: formatPct(cashFlow.collectionEfficiencyPct),
      tone: "warning",
    },
    { label: "Outstanding", value: formatMoney(cashFlow.outstanding), tone: "slate" },
    { label: "Improvable cash", value: formatMoney(financialImpact), tone: "warning" },
  ];

  candidates.push({
    constraintType: "cash_efficiency",
    title: `Collection efficiency at ${formatPct(cashFlow.collectionEfficiencyPct)} — ${formatMoney(financialImpact)} improvable`,
    kpis,
    financialImpact,
    score: financialImpact * URGENCY.cash_efficiency,
  });
}

function scorePmVariance(pmPerformance: PmPerformance, candidates: ScoredConstraint[]): void {
  if (pmPerformance.rows.length === 0) return;

  const worst = pmPerformance.rows.reduce((prev, curr) =>
    curr.variancePct < prev.variancePct ? curr : prev,
  );

  if (worst.variancePct >= -3) return;

  const financialImpact = Number(worst.revenue) * (Math.abs(worst.variancePct) / 100);
  if (financialImpact < MIN_IMPACT) return;

  const kpis: ExecutivePriorityKpi[] = [
    { label: "Project manager", value: worst.pm, tone: "accent" },
    { label: "PM margin", value: formatPct(worst.marginPct), tone: "warning" },
    {
      label: "Below average",
      value: `${Math.abs(worst.variancePct).toFixed(1)} pts`,
      tone: "danger",
    },
    { label: "Jobs managed", value: String(worst.jobCount), tone: "slate" },
  ];

  candidates.push({
    constraintType: "pm_variance",
    title: `${worst.pm} running ${Math.abs(worst.variancePct).toFixed(1)} pts below company average`,
    kpis,
    financialImpact,
    score: financialImpact * URGENCY.pm_variance,
  });
}

function scoreToStatus(score: number): WeeklyPriorityStatus {
  if (score > 50_000) return "Critical";
  if (score > 20_000) return "High";
  if (score > 5_000) return "Moderate";
  return "Resolved";
}

function getWorstBucket(buckets: { bucket: string; count: number; amount: string }[]): string {
  const order = [">90", "61-90", "31-60", "1-30", "Current"];
  for (const label of order) {
    const b = buckets.find((b) => b.bucket === label);
    if (b && b.count > 0) return label;
  }
  return ">30";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
