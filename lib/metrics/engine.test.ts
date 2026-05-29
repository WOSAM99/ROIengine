import { describe, expect, it } from "vitest";
import { Decimal } from "decimal.js";
import { computeFromJobs } from "./engine";
import type { MetricJob } from "./types";

function job(partial: Partial<MetricJob> & { jobId: string }): MetricJob {
  return {
    jobId: partial.jobId,
    invoiceAmount: partial.invoiceAmount ?? new Decimal(0),
    jobCost: partial.jobCost ?? new Decimal(0),
    cashReceived: partial.cashReceived ?? new Decimal(0),
    balanceDue: partial.balanceDue ?? new Decimal(0),
    projectType: partial.projectType ?? null,
    projectManager: partial.projectManager ?? null,
    arBucket: partial.arBucket ?? null,
    startDate: partial.startDate ?? null,
    finishDate: partial.finishDate ?? null,
  };
}

describe("computeFromJobs — deterministic metrics", () => {
  // Three jobs with hand-computed totals:
  // J1: rev 100, cost 60 → GP 40, margin 40%
  // J2: rev 200, cost 180 → GP 20, margin 10%
  // J3: rev 500, cost 450 → GP 50, margin 10%
  // Company: rev 800, cost 690, GP 110, margin 13.75%
  const jobs: MetricJob[] = [
    job({
      jobId: "J1",
      invoiceAmount: new Decimal(100),
      jobCost: new Decimal(60),
      cashReceived: new Decimal(100),
      balanceDue: new Decimal(0),
      projectType: "water",
      projectManager: "Ana",
      arBucket: null,
    }),
    job({
      jobId: "J2",
      invoiceAmount: new Decimal(200),
      jobCost: new Decimal(180),
      cashReceived: new Decimal(50),
      balanceDue: new Decimal(150),
      projectType: "water",
      projectManager: "Ana",
      arBucket: "1-30",
    }),
    job({
      jobId: "J3",
      invoiceAmount: new Decimal(500),
      jobCost: new Decimal(450),
      cashReceived: new Decimal(100),
      balanceDue: new Decimal(400),
      projectType: "mold",
      projectManager: "Ben",
      arBucket: "61-90",
    }),
  ];

  const metrics = computeFromJobs(jobs, 0.3);

  it("Profit Pulse totals match hand-calc", () => {
    expect(metrics.profitPulse.totalRevenue).toBe("800");
    expect(metrics.profitPulse.totalCost).toBe("690");
    expect(metrics.profitPulse.grossProfit).toBe("110");
    expect(metrics.profitPulse.grossMarginPct).toBe(13.75);
    expect(metrics.profitPulse.totalJobs).toBe(3);
    expect(metrics.profitPulse.revenuePerJob).toBe("266.67");
  });

  it("Job Health per-type aggregates + below-target count", () => {
    const water = metrics.jobHealth.rows.find((r) => r.projectType === "water")!;
    expect(water.revenue).toBe("300");
    expect(water.cost).toBe("240");
    expect(water.marginPct).toBe(20);
    expect(water.belowTargetCount).toBe(1); // J2 @ 10% < 30%
    expect(water.jobCount).toBe(2);

    const mold = metrics.jobHealth.rows.find((r) => r.projectType === "mold")!;
    expect(mold.marginPct).toBe(10);
    expect(mold.belowTargetCount).toBe(1);

    expect(metrics.jobHealth.targetMarginPct).toBe(30);
    expect(metrics.jobHealth.lowMarginJobCount).toBe(2);
  });

  it("Cash Flow totals + A/R Risk %", () => {
    expect(metrics.cashFlow.cashCollected).toBe("250");
    expect(metrics.cashFlow.totalBilled).toBe("800");
    expect(metrics.cashFlow.outstanding).toBe("550");
    expect(metrics.cashFlow.collectionGap).toBe("550");
    expect(metrics.cashFlow.collectionEfficiencyPct).toBe(31.25);
    // Only J3 is overdue (61-90 bucket); J2 is 1-30.
    expect(metrics.cashFlow.arOver30).toBe("400");
    expect(metrics.cashFlow.arRiskPct).toBe(72.73);
  });

  it("PM Performance variance is computed against company avg", () => {
    const ana = metrics.pmPerformance.rows.find((r) => r.pm === "Ana")!;
    const ben = metrics.pmPerformance.rows.find((r) => r.pm === "Ben")!;
    expect(ana.marginPct).toBe(20);
    expect(ben.marginPct).toBe(10);
    expect(metrics.pmPerformance.companyAvgMarginPct).toBe(13.75);
    expect(ana.variancePct).toBe(6.25);
    expect(ben.variancePct).toBe(-3.75);
  });

  it("Top Insights ranks margin leaks and A/R delay by impact", () => {
    const items = metrics.topInsights.items;
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(5); // INSIGHT_LIMIT raised 3 → 5
    // AR leak impact = 400 — should be the top insight (critical severity beats all)
    const top = items[0];
    expect(top.dimension).toBe("ar");
    expect(top.estimatedImpact).toBe("400");
  });
});

describe("edge cases", () => {
  it("handles empty job list without dividing by zero", () => {
    const metrics = computeFromJobs([], 0.3);
    expect(metrics.profitPulse.totalRevenue).toBe("0");
    expect(metrics.profitPulse.grossMarginPct).toBe(0);
    expect(metrics.profitPulse.revenuePerJob).toBe("0");
    expect(metrics.topInsights.items).toEqual([]);
  });

  it("skips A/R bucket math when balance is zero", () => {
    const metrics = computeFromJobs(
      [
        job({
          jobId: "x",
          invoiceAmount: new Decimal(100),
          jobCost: new Decimal(100),
          cashReceived: new Decimal(100),
          balanceDue: new Decimal(0),
          arBucket: "61-90",
        }),
      ],
      0.3,
    );
    expect(metrics.cashFlow.buckets).toEqual([]);
    expect(metrics.cashFlow.arOver30).toBe("0");
  });
});
