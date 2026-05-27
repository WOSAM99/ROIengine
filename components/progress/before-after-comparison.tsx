import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatPct } from "@/lib/format";
import type { ComparisonDelta, PeriodSnapshot } from "@/lib/progress/compute-progress";

type Props = {
  previous: PeriodSnapshot;
  current: PeriodSnapshot;
  previousLabel: string;
  currentLabel: string;
  delta: ComparisonDelta;
};

type RowDef = {
  label: string;
  prev: string;
  curr: string;
  deltaValue: number;
  lowerIsBetter?: boolean;
};

function DeltaIcon({ value, lowerIsBetter }: { value: number; lowerIsBetter?: boolean }) {
  const improved = lowerIsBetter ? value < 0 : value > 0;
  const declined = lowerIsBetter ? value > 0 : value < 0;
  if (improved) return <TrendingUp className="text-success-600 h-3.5 w-3.5 shrink-0" />;
  if (declined) return <TrendingDown className="text-danger-600 h-3.5 w-3.5 shrink-0" />;
  return <Minus className="text-muted-foreground h-3.5 w-3.5 shrink-0" />;
}

function deltaClass(value: number, lowerIsBetter?: boolean): string {
  const improved = lowerIsBetter ? value < 0 : value > 0;
  const declined = lowerIsBetter ? value > 0 : value < 0;
  if (improved) return "text-success-700";
  if (declined) return "text-danger-700";
  return "text-muted-foreground";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BeforeAfterComparison({
  previous,
  current,
  previousLabel,
  currentLabel,
  delta,
}: Props) {
  const rows: RowDef[] = [
    {
      label: "Gross Margin",
      prev: formatPct(previous.metrics.jobHealth.avgMarginPct),
      curr: formatPct(current.metrics.jobHealth.avgMarginPct),
      deltaValue: delta.grossMarginPct,
    },
    {
      label: "AR Over 30",
      prev: formatMoney(previous.metrics.cashFlow.arOver30),
      curr: formatMoney(current.metrics.cashFlow.arOver30),
      deltaValue: delta.arOver30,
      lowerIsBetter: true,
    },
    {
      label: "Cash Collected",
      prev: formatMoney(previous.metrics.cashFlow.cashCollected),
      curr: formatMoney(current.metrics.cashFlow.cashCollected),
      deltaValue: delta.cashCollected,
    },
    {
      label: "Revenue",
      prev: formatMoney(previous.metrics.profitPulse.totalRevenue),
      curr: formatMoney(current.metrics.profitPulse.totalRevenue),
      deltaValue: delta.totalRevenue,
    },
    {
      label: "Revenue / Job",
      prev: formatMoney(previous.metrics.profitPulse.revenuePerJob),
      curr: formatMoney(current.metrics.profitPulse.revenuePerJob),
      deltaValue: delta.revenuePerJob,
    },
    {
      label: "Health Score",
      prev: String(previous.healthScore.total),
      curr: String(current.healthScore.total),
      deltaValue: delta.healthScore,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Period Comparison</CardTitle>
        <div className="mt-1 grid grid-cols-3 text-xs">
          <span className="text-muted-foreground">&nbsp;</span>
          <span className="text-muted-foreground text-center font-medium">
            {previousLabel}
            <br />
            <span className="text-muted-foreground/70">{formatDate(previous.uploadedAt)}</span>
          </span>
          <span className="text-muted-foreground text-center font-medium">
            {currentLabel}
            <br />
            <span className="text-muted-foreground/70">{formatDate(current.uploadedAt)}</span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border-border/80 bg-muted/40 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="px-4 py-2.5 font-medium">Metric</th>
                <th className="px-4 py-2.5 text-right font-medium">Previous</th>
                <th className="px-4 py-2.5 text-right font-medium">Change</th>
                <th className="px-4 py-2.5 text-right font-medium">Current</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="text-muted-foreground px-4 py-2.5 text-xs">{row.label}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{row.prev}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`flex items-center justify-end gap-1 tabular-nums ${deltaClass(row.deltaValue, row.lowerIsBetter)}`}
                    >
                      <DeltaIcon value={row.deltaValue} lowerIsBetter={row.lowerIsBetter} />
                      <span className="text-xs font-medium">
                        {row.deltaValue > 0 ? "+" : ""}
                        {typeof row.deltaValue === "number" && Math.abs(row.deltaValue) < 100
                          ? row.deltaValue.toFixed(1)
                          : formatMoney(Math.abs(row.deltaValue))}
                      </span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{row.curr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
