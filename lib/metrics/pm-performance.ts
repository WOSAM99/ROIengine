import type { MetricJob, PmPerformance, PmRow } from "./types";
import { marginPercent, round2, sum, toMoneyString } from "./helpers";

const UNASSIGNED = "Unassigned";

export function computePmPerformance(jobs: MetricJob[]): PmPerformance {
  const companyRevenue = sum(jobs.map((j) => j.invoiceAmount));
  const companyCost = sum(jobs.map((j) => j.jobCost));
  const companyAvgMarginPct = marginPercent(companyRevenue, companyCost);

  const byPm = new Map<string, MetricJob[]>();
  for (const job of jobs) {
    const pm = job.projectManager?.trim() || UNASSIGNED;
    const bucket = byPm.get(pm) ?? [];
    bucket.push(job);
    byPm.set(pm, bucket);
  }

  const rows: PmRow[] = [];
  for (const [pm, pmJobs] of byPm) {
    const revenue = sum(pmJobs.map((j) => j.invoiceAmount));
    const cost = sum(pmJobs.map((j) => j.jobCost));
    const pmMarginPct = marginPercent(revenue, cost);
    rows.push({
      pm,
      revenue: toMoneyString(revenue),
      cost: toMoneyString(cost),
      marginPct: pmMarginPct,
      variancePct: round2(pmMarginPct - companyAvgMarginPct),
      jobCount: pmJobs.length,
    });
  }

  rows.sort((a, b) => Number(b.revenue) - Number(a.revenue));

  return {
    companyAvgMarginPct,
    rows,
  };
}
