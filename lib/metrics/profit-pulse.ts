import { Decimal } from "decimal.js";
import type { MetricJob, ProfitPulse } from "./types";
import { divideSafe, marginPercent, sum, toMoneyString, ZERO } from "./helpers";

export function computeProfitPulse(jobs: MetricJob[]): ProfitPulse {
  const totalRevenue = sum(jobs.map((j) => j.invoiceAmount));
  const totalCost = sum(jobs.map((j) => j.jobCost));
  const grossProfit = totalRevenue.minus(totalCost);
  const totalJobs = jobs.length;
  const revenuePerJob = totalJobs === 0 ? ZERO : divideSafe(totalRevenue, new Decimal(totalJobs));

  return {
    totalRevenue: toMoneyString(totalRevenue),
    totalCost: toMoneyString(totalCost),
    grossProfit: toMoneyString(grossProfit),
    grossMarginPct: marginPercent(totalRevenue, totalCost),
    totalJobs,
    revenuePerJob: toMoneyString(revenuePerJob),
  };
}
