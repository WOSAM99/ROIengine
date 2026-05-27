import { Decimal } from "decimal.js";

export type MoneyString = string;

export type MetricJob = {
  jobId: string;
  invoiceAmount: Decimal;
  jobCost: Decimal;
  cashReceived: Decimal;
  balanceDue: Decimal;
  projectType: string | null;
  projectManager: string | null;
  arBucket: string | null;
  startDate: Date | null;
  finishDate: Date | null;
};

export type ProfitPulse = {
  totalRevenue: MoneyString;
  totalCost: MoneyString;
  grossProfit: MoneyString;
  grossMarginPct: number;
  totalJobs: number;
  revenuePerJob: MoneyString;
};

export type JobTypeRow = {
  projectType: string;
  revenue: MoneyString;
  cost: MoneyString;
  marginPct: number;
  jobCount: number;
  belowTargetCount: number;
  avgCycleDays: number | null;
};

export type JobHealth = {
  targetMarginPct: number;
  avgMarginPct: number;
  lowMarginJobCount: number;
  rows: JobTypeRow[];
};

export type ArBucketRow = {
  bucket: string;
  amount: MoneyString;
  count: number;
};

export type CashFlow = {
  cashCollected: MoneyString;
  totalBilled: MoneyString;
  outstanding: MoneyString;
  collectionGap: MoneyString;
  collectionEfficiencyPct: number;
  arOver30: MoneyString;
  arRiskPct: number;
  buckets: ArBucketRow[];
};

export type PmRow = {
  pm: string;
  revenue: MoneyString;
  cost: MoneyString;
  marginPct: number;
  variancePct: number;
  jobCount: number;
};

export type PmPerformance = {
  companyAvgMarginPct: number;
  rows: PmRow[];
};

export type InsightDimension = "jobType" | "pm" | "ar";

/**
 * Severity tiers for ranking and display:
 *   - critical: urgent / high-impact leaks (A/R past 60 days, ≥15% of revenue lost to one leak)
 *   - high:     material leaks (≥5% of revenue impacted, or 31-60 day A/R)
 *   - medium:   noticeable but smaller leaks
 */
export type InsightSeverity = "critical" | "high" | "medium";

export type InsightNarrative = {
  /** Plain-language explanation of what is happening. */
  explanation: string;
  /** Most likely root cause (one short sentence). */
  rootCause: string;
  /** 1-2 concrete actions a PM / ops lead should take. */
  recommendations: string[];
};

export type Insight = {
  id: string;
  title: string;
  dimension: InsightDimension;
  severity: InsightSeverity;
  /** The core signal in plain language, e.g. "6.6 pts below your 30% target". */
  rule: string;
  /** Financial impact as a dollar/pound amount (serialized Decimal). */
  estimatedImpact: MoneyString;
  /** Extra context, e.g. "Across 5 jobs that billed £50K". */
  detail: string;
  /** AI-generated narrative. Persisted on Upload.insightsNarrative at import time, merged on read.
   *  null when: no ANTHROPIC_API_KEY, call failed, or pre-feature upload. */
  narrative?: InsightNarrative | null;
};

export type TopInsights = {
  items: Insight[];
};

export type Metrics = {
  profitPulse: ProfitPulse;
  jobHealth: JobHealth;
  cashFlow: CashFlow;
  pmPerformance: PmPerformance;
  topInsights: TopInsights;
};

export type ConstraintType =
  | "ar_aging"
  | "gross_margin"
  | "negative_job_type"
  | "cash_efficiency"
  | "pm_variance";

export type ExecutivePriorityKpi = {
  label: string;
  value: string;
  tone: "danger" | "warning" | "info" | "success" | "accent" | "slate";
};

export type ExecutivePriority = {
  constraintType: ConstraintType;
  title: string;
  kpis: ExecutivePriorityKpi[];
  score: number;
  directive: string | null;
  whyItMatters: string | null;
  howToExecute: string[] | null;
};

export type WeeklyPriorityStatus = "Critical" | "High" | "Moderate" | "Resolved";

export type WeeklyPriority = {
  id: string;
  constraintType: ConstraintType;
  status: WeeklyPriorityStatus;
  estimatedImpact: string;
  title: string | null;
  reason: string | null;
  expectedOutcome: string | null;
  actions: string[] | null;
};

export type WeeklyPriorities = { items: WeeklyPriority[] };

export type ExtendedMetrics = Metrics & {
  executivePriority: ExecutivePriority | null;
  weeklyPriorities: WeeklyPriorities;
};
