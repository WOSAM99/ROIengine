import type { Metrics } from "./types";

export type HealthScoreBreakdown = {
  marginHealth: number;
  cashFlowHealth: number;
  jobProfitability: number;
  collections: number;
  trendDirection: number;
};

export type HealthScoreResult = {
  total: number;
  breakdown: HealthScoreBreakdown;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeHealthScore(input: {
  metrics: Metrics;
  previousMetrics?: Metrics | null;
}): HealthScoreResult {
  const { metrics, previousMetrics } = input;
  const { jobHealth, cashFlow, profitPulse } = metrics;

  const marginHealth =
    jobHealth.targetMarginPct === 0
      ? 25
      : clamp((jobHealth.avgMarginPct / jobHealth.targetMarginPct) * 25, 0, 25);

  const cashFlowHealth = clamp((cashFlow.collectionEfficiencyPct / 100) * 25, 0, 25);

  const jobProfitability =
    profitPulse.totalJobs === 0
      ? 10
      : clamp(
          ((profitPulse.totalJobs - jobHealth.lowMarginJobCount) / profitPulse.totalJobs) * 20,
          0,
          20,
        );

  const collections = clamp((1 - cashFlow.arRiskPct / 100) * 15, 0, 15);

  let trendDirection: number;
  if (!previousMetrics) {
    trendDirection = 7.5;
  } else {
    const delta = metrics.jobHealth.avgMarginPct - previousMetrics.jobHealth.avgMarginPct;
    if (delta > 1) {
      trendDirection = 15;
    } else if (delta >= -1) {
      trendDirection = 7.5;
    } else {
      trendDirection = 0;
    }
  }

  const raw = marginHealth + cashFlowHealth + jobProfitability + collections + trendDirection;
  const total = clamp(Math.round(raw), 0, 100);

  return {
    total,
    breakdown: {
      marginHealth,
      cashFlowHealth,
      jobProfitability,
      collections,
      trendDirection,
    },
  };
}
