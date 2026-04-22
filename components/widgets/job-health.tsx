"use client";

import { useRef } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { JobHealth } from "@/lib/metrics/types";
import { formatMoney, formatPct, formatInt } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AXIS_PROPS, GRID_PROPS, TOOLTIP_PROPS } from "./chart-theme";
import { useElementSize } from "@/hooks/use-element-size";

type JobHealthWidgetProps = {
  data: JobHealth;
};

type ChartRow = {
  projectType: string;
  revenue: number;
  marginPct: number;
  isBelow: boolean;
};

export function JobHealthWidget({ data }: JobHealthWidgetProps) {
  const chartData: ChartRow[] = data.rows.map((row) => ({
    projectType: row.projectType,
    revenue: Number(row.revenue),
    marginPct: row.marginPct,
    isBelow: row.marginPct < data.targetMarginPct,
  }));

  const marginRatio = data.avgMarginPct / Math.max(1, data.targetMarginPct);
  const marginClamped = Math.max(0, Math.min(1.2, marginRatio));

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>Job Health</CardTitle>
            <CardDescription className="break-words">
              Avg margin <span className="font-numeric">{formatPct(data.avgMarginPct)}</span> ·{" "}
              <span className="font-numeric">{formatInt(data.lowMarginJobCount)}</span> below target{" "}
              <span className="font-numeric">{formatPct(data.targetMarginPct, 0)}</span>
            </CardDescription>
          </div>
          <MarginGauge
            avgPct={data.avgMarginPct}
            targetPct={data.targetMarginPct}
            ratio={marginClamped}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {chartData.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No data for the selected upload.
          </p>
        ) : (
          <>
            <div className="text-muted-foreground flex flex-wrap items-center justify-end gap-3 text-[11px]">
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="from-accent-500 inline-block size-2.5 rounded-sm bg-gradient-to-b to-fuchsia-500"
                />
                On target
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="from-danger-500 to-danger-700 inline-block size-2.5 rounded-sm bg-gradient-to-b"
                />
                Below target
              </span>
            </div>
            <RevenueBarChart chartData={chartData} />
            <div className="border-border/80 bg-muted/40 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border/60 border-b text-[11px] tracking-wider uppercase">
                    <th className="px-3 py-2.5 text-left font-semibold">Type</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Jobs</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Revenue</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Margin</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Below</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => {
                    const isBelow = row.marginPct < data.targetMarginPct;
                    return (
                      <tr
                        key={row.projectType}
                        className="border-border/40 bg-card border-b last:border-b-0"
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className={cn(
                                "inline-block size-2.5 shrink-0 rounded-sm bg-gradient-to-b",
                                isBelow
                                  ? "from-danger-500 to-danger-700"
                                  : "from-accent-500 to-fuchsia-500",
                              )}
                            />
                            <span className="break-words capitalize">{row.projectType}</span>
                          </div>
                        </td>
                        <td className="font-numeric px-3 py-2.5 text-right whitespace-nowrap">
                          {row.jobCount}
                        </td>
                        <td className="font-numeric px-3 py-2.5 text-right whitespace-nowrap">
                          {formatMoney(row.revenue)}
                        </td>
                        <td
                          className={cn(
                            "font-numeric px-3 py-2.5 text-right whitespace-nowrap",
                            isBelow ? "text-danger-700 font-semibold" : "text-success-700",
                          )}
                        >
                          {formatPct(row.marginPct)}
                        </td>
                        <td className="font-numeric px-3 py-2.5 text-right whitespace-nowrap">
                          {row.belowTargetCount > 0 ? (
                            <span className="bg-danger-50 text-danger-700 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold">
                              {row.belowTargetCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Own-size Recharts: measures its container via ResizeObserver and renders
 * BarChart with explicit pixel width/height. Avoids Recharts 3.x's
 * `ResponsiveContainer` warning ("width(-1) and height(-1) of chart should be
 * greater than 0"), which fires when the container reports 0 dimensions during
 * hydration. With an explicit size, there is no percent math to resolve.
 */
function RevenueBarChart({ chartData }: { chartData: ChartRow[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useElementSize(containerRef);
  const ready = size.width > 0 && size.height > 0;

  return (
    <div ref={containerRef} className="h-52 w-full min-w-0">
      {ready ? (
        <BarChart
          width={size.width}
          height={size.height}
          data={chartData}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          barCategoryGap="30%"
        >
          <defs>
            {/* On-target: the platform primary gradient (accent violet → fuchsia).
                Matches bg-gradient-primary used on hero MetricCard, accent buttons, and the brand wordmark. */}
            <linearGradient id="grad-on-target" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-500)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--fuchsia-500)" stopOpacity={0.85} />
            </linearGradient>
            {/* Below-target: rose/red gradient. Semantic "losing margin" without the harsh yellow. */}
            <linearGradient id="grad-below-target" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--danger-500)" stopOpacity={0.95} />
              <stop offset="100%" stopColor="var(--danger-700)" stopOpacity={0.8} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="projectType" {...AXIS_PROPS} interval={0} />
          <YAxis {...AXIS_PROPS} tickFormatter={(v) => formatMoney(v)} width={72} />
          <Tooltip
            formatter={(value) => formatMoney(Number(value))}
            cursor={TOOLTIP_PROPS.cursor}
            contentStyle={TOOLTIP_PROPS.contentStyle}
            itemStyle={TOOLTIP_PROPS.itemStyle}
            labelStyle={TOOLTIP_PROPS.labelStyle}
          />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={`bar-${entry.projectType}`}
                fill={entry.isBelow ? "url(#grad-below-target)" : "url(#grad-on-target)"}
              />
            ))}
          </Bar>
        </BarChart>
      ) : (
        <Skeleton className="h-full w-full rounded-xl" />
      )}
    </div>
  );
}

function MarginGauge({
  avgPct,
  targetPct,
  ratio,
}: {
  avgPct: number;
  targetPct: number;
  ratio: number;
}) {
  const size = 52;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentOfTarget = Math.min(1, ratio);
  const dashOffset = circumference * (1 - percentOfTarget);
  const hitTarget = avgPct >= targetPct;
  // Stable gradient id per-gauge to avoid collisions if multiple MarginGauges
  // render on the same page (they share document-level SVG namespace).
  const gradientId = `margin-gauge-gradient-${hitTarget ? "primary" : "danger"}`;
  return (
    <div className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          {/* Hit target → platform primary gradient (violet → fuchsia).
              Below target → warning amber — preserves the "watch" semantic. */}
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            {hitTarget ? (
              <>
                <stop offset="0%" stopColor="var(--accent-500)" />
                <stop offset="100%" stopColor="var(--fuchsia-500)" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="var(--danger-500)" />
                <stop offset="100%" stopColor="var(--danger-700)" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 400ms ease-out" }}
        />
      </svg>
      <span className="font-numeric text-foreground absolute text-[11px] font-bold">
        {Math.round(avgPct)}%
      </span>
    </div>
  );
}
