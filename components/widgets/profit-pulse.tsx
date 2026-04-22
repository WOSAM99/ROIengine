import type { ProfitPulse } from "@/lib/metrics/types";
import { formatInt, formatMoney, formatPct } from "@/lib/format";
import { MetricCard } from "./metric-card";

type ProfitPulseWidgetProps = {
  data: ProfitPulse;
};

export function ProfitPulseWidget({ data }: ProfitPulseWidgetProps) {
  const gpIsPositive = Number(data.grossProfit) >= 0;
  const marginSublabel = `Target health at a glance`;

  return (
    <section aria-labelledby="profit-pulse-heading" className="space-y-4">
      <header className="flex items-end justify-between">
        <h2
          id="profit-pulse-heading"
          className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase"
        >
          Profit Pulse
        </h2>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <MetricCard
          label="Revenue"
          value={formatMoney(data.totalRevenue)}
          accent="success"
          sublabel="Total billed"
        />
        <MetricCard
          label="Cost"
          value={formatMoney(data.totalCost)}
          accent="slate"
          sublabel="Labor + subs"
        />
        <MetricCard
          label="Gross Profit"
          value={formatMoney(data.grossProfit)}
          accent={gpIsPositive ? "success" : "danger"}
          sublabel={gpIsPositive ? "Revenue − cost" : "Loss — investigate"}
        />
        <MetricCard
          hero
          label="Gross Margin"
          value={formatPct(data.grossMarginPct)}
          sublabel={marginSublabel}
        />
        <MetricCard
          label="Jobs"
          value={formatInt(data.totalJobs)}
          accent="info"
          sublabel="Imported rows"
        />
        <MetricCard
          label="Rev / Job"
          value={formatMoney(data.revenuePerJob)}
          accent="warning"
          sublabel="Average billable"
        />
      </div>
    </section>
  );
}
