"use client";

import { Fragment, useRef } from "react";
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useElementSize } from "@/hooks/use-element-size";
import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS } from "@/components/widgets/chart-theme";
import { formatMoney, formatPct } from "@/lib/format";
import type { ProgressPeriod } from "@/lib/progress/compute-progress";

type Props = {
  periods: ProgressPeriod[];
};

type Trend = "up" | "flat" | "down";

type ChartPoint = {
  label: string;
  score: number | null;
  trend: Trend;
};

function buildChartData(periods: ProgressPeriod[]): ChartPoint[] {
  let prevScore: number | null = null;
  return periods.map((p) => {
    if (!p.snapshot) {
      return { label: p.weekLabel, score: null, trend: "flat" as Trend };
    }
    const score = p.snapshot.healthScore.total;
    let trend: Trend = "flat";
    if (prevScore !== null) {
      const delta = score - prevScore;
      if (delta > 1) trend = "up";
      else if (delta < -1) trend = "down";
    }
    prevScore = score;
    return { label: p.weekLabel, score, trend };
  });
}

function dotColor(trend: Trend): string {
  if (trend === "up") return "var(--success-500)";
  if (trend === "down") return "var(--danger-500)";
  return "var(--warning-500)";
}

export function HealthScoreTimeline({ periods }: Props) {
  const chartData = buildChartData(periods);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Score</CardTitle>
        <CardDescription>
          0–100 operational score by calendar week. Weeks with no upload are shown as gaps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <HealthLineChart chartData={chartData} />
        <div className="border-border/80 bg-muted/40 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="px-4 py-2.5 font-medium">Week</th>
                <th className="px-4 py-2.5 text-right font-medium">Score</th>
                <th className="px-4 py-2.5 text-right font-medium">Gross Margin</th>
                <th className="px-4 py-2.5 text-right font-medium">Cash Collected</th>
                <th className="px-4 py-2.5 text-right font-medium">AR Over 30</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p, i) => {
                const showMonthHeader = i === 0 || periods[i - 1].monthLabel !== p.monthLabel;
                return (
                  <Fragment key={p.weekStart}>
                    {showMonthHeader && (
                      <tr className="bg-muted/60">
                        <td
                          colSpan={5}
                          className="text-muted-foreground px-4 py-1.5 text-[11px] font-semibold tracking-wider uppercase"
                        >
                          {p.monthLabel}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b last:border-0">
                      <td className="text-muted-foreground px-4 py-2.5 text-xs">{p.weekLabel}</td>
                      {p.snapshot ? (
                        <>
                          <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                            {p.snapshot.healthScore.total}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatPct(p.snapshot.metrics.jobHealth.avgMarginPct)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatMoney(p.snapshot.metrics.cashFlow.cashCollected)}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {formatMoney(p.snapshot.metrics.cashFlow.arOver30)}
                          </td>
                        </>
                      ) : (
                        <td
                          colSpan={4}
                          className="text-muted-foreground/60 px-4 py-2.5 text-right text-xs italic"
                        >
                          No upload this week
                        </td>
                      )}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function HealthLineChart({ chartData }: { chartData: ChartPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const ready = size.width > 0 && size.height > 0;

  return (
    <div ref={containerRef} className="h-48 w-full min-w-0">
      {ready && (
        <LineChart
          width={size.width}
          height={size.height}
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="label" {...AXIS_PROPS} />
          <YAxis domain={[0, 100]} {...AXIS_PROPS} />
          <Tooltip {...TOOLTIP_PROPS} formatter={(value) => [`${value ?? "—"}`, "Score"]} />
          <Line
            type="monotone"
            dataKey="score"
            stroke="var(--accent-500)"
            strokeWidth={2}
            connectNulls={false}
            dot={(props) => {
              const { cx, cy, payload } = props as {
                cx: number;
                cy: number;
                payload: ChartPoint;
              };
              if (payload.score === null) {
                return <circle key={`dot-${cx}-${cy}`} cx={cx} cy={cy} r={0} fill="transparent" />;
              }
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={4}
                  fill={dotColor(payload.trend)}
                  stroke="var(--card)"
                  strokeWidth={1.5}
                />
              );
            }}
            activeDot={{ r: 5, fill: "var(--accent-500)" }}
          />
        </LineChart>
      )}
    </div>
  );
}
