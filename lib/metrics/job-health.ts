import { Decimal } from "decimal.js";
import type { JobHealth, JobTypeRow, MetricJob } from "./types";
import { marginPercent, round2, sum, toMoneyString } from "./helpers";

const UNKNOWN_TYPE = "unknown";

export type JobHealthInput = {
  jobs: MetricJob[];
  targetMarginFraction: number;
};

export function computeJobHealth({ jobs, targetMarginFraction }: JobHealthInput): JobHealth {
  const target = new Decimal(targetMarginFraction);
  const lowMarginJobCount = jobs.filter((j) => jobMarginFraction(j).lt(target)).length;

  const byType = new Map<string, MetricJob[]>();
  for (const job of jobs) {
    const key = job.projectType ?? UNKNOWN_TYPE;
    const bucket = byType.get(key) ?? [];
    bucket.push(job);
    byType.set(key, bucket);
  }

  const rows: JobTypeRow[] = [];
  for (const [projectType, typeJobs] of byType) {
    const revenue = sum(typeJobs.map((j) => j.invoiceAmount));
    const cost = sum(typeJobs.map((j) => j.jobCost));
    const belowTargetCount = typeJobs.filter((j) => jobMarginFraction(j).lt(target)).length;
    const avgCycleDays = averageCycleDays(typeJobs);
    rows.push({
      projectType,
      revenue: toMoneyString(revenue),
      cost: toMoneyString(cost),
      marginPct: marginPercent(revenue, cost),
      jobCount: typeJobs.length,
      belowTargetCount,
      avgCycleDays,
    });
  }

  rows.sort((a, b) => Number(b.revenue) - Number(a.revenue));

  return {
    targetMarginPct: round2(targetMarginFraction * 100),
    avgMarginPct: averageJobMarginPct(jobs),
    lowMarginJobCount,
    rows,
  };
}

function jobMarginFraction(job: MetricJob): Decimal {
  if (job.invoiceAmount.isZero()) return new Decimal(0);
  return job.invoiceAmount.minus(job.jobCost).div(job.invoiceAmount);
}

function averageJobMarginPct(jobs: MetricJob[]): number {
  if (jobs.length === 0) return 0;
  const fractions = jobs.map((j) => jobMarginFraction(j));
  const total = sum(fractions);
  return round2(total.div(jobs.length).times(100).toNumber());
}

function averageCycleDays(jobs: MetricJob[]): number | null {
  const days: number[] = [];
  for (const job of jobs) {
    if (!job.startDate || !job.finishDate) continue;
    const diff = Math.round((job.finishDate.getTime() - job.startDate.getTime()) / 86_400_000);
    if (Number.isFinite(diff)) days.push(diff);
  }
  if (days.length === 0) return null;
  const avg = days.reduce((a, b) => a + b, 0) / days.length;
  return round2(avg);
}
