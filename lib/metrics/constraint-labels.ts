import type { ConstraintType } from "@/lib/metrics/types";

/**
 * Deterministic, human-readable label per constraint type. Used as a fallback
 * title / directive in the Executive Priority and Weekly Priorities widgets when
 * the AI narrative is unavailable (so they never show a perpetual loading
 * skeleton). The AI text, when present, always takes precedence.
 */
export const CONSTRAINT_LABEL: Record<ConstraintType, string> = {
  ar_aging: "Reduce accounts-receivable aging",
  gross_margin: "Lift gross margin toward target",
  negative_job_type: "Fix unprofitable job types",
  cash_efficiency: "Improve cash collection",
  pm_variance: "Address PM performance variance",
};
