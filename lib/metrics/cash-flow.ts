import { Decimal } from "decimal.js";
import type { ArBucketRow, CashFlow, MetricJob } from "./types";
import { round2, sum, toMoneyString } from "./helpers";

const BUCKET_ORDER = ["Current", "1-30", "31-60", "61-90", ">90"] as const;
const OVERDUE_BUCKETS = new Set(["31-60", "61-90", ">90"]);

export function computeCashFlow(jobs: MetricJob[]): CashFlow {
  const totalBilled = sum(jobs.map((j) => j.invoiceAmount));
  const cashCollected = sum(jobs.map((j) => j.cashReceived));
  const outstanding = sum(jobs.map((j) => j.balanceDue));
  const collectionGap = totalBilled.minus(cashCollected);
  const efficiency = totalBilled.isZero()
    ? 0
    : round2(cashCollected.div(totalBilled).times(100).toNumber());

  const bucketMap = new Map<string, { amount: Decimal; count: number }>();
  for (const job of jobs) {
    if (!job.arBucket || job.balanceDue.lte(0)) continue;
    const existing = bucketMap.get(job.arBucket) ?? { amount: new Decimal(0), count: 0 };
    existing.amount = existing.amount.plus(job.balanceDue);
    existing.count += 1;
    bucketMap.set(job.arBucket, existing);
  }

  const buckets: ArBucketRow[] = BUCKET_ORDER.filter((b) => bucketMap.has(b)).map((b) => ({
    bucket: b,
    amount: toMoneyString(bucketMap.get(b)!.amount),
    count: bucketMap.get(b)!.count,
  }));

  const arOver30 = Array.from(bucketMap.entries())
    .filter(([bucket]) => OVERDUE_BUCKETS.has(bucket))
    .reduce((acc, [, v]) => acc.plus(v.amount), new Decimal(0));

  const arRisk = outstanding.isZero() ? 0 : round2(arOver30.div(outstanding).times(100).toNumber());

  return {
    cashCollected: toMoneyString(cashCollected),
    totalBilled: toMoneyString(totalBilled),
    outstanding: toMoneyString(outstanding),
    collectionGap: toMoneyString(collectionGap),
    collectionEfficiencyPct: efficiency,
    arOver30: toMoneyString(arOver30),
    arRiskPct: arRisk,
    buckets,
  };
}
