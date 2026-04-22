/**
 * Chart theme — the single source of truth for every Recharts usage.
 *
 * Rule: every <Line>, <Bar>, <Area>, <Pie>, <Cell>, <XAxis>, <YAxis>, <Tooltip>,
 * <Legend>, <CartesianGrid>, <ReferenceLine> in this codebase MUST pull colors and
 * presentation defaults from this module. Zero raw hex. Zero Tailwind color
 * utilities inside chart props.
 *
 * See `AI_DOCS/design/design-dna.md` → "Chart color contract".
 */

import {
  AR_BUCKET_COLOR,
  CHART_COLORS,
  JOB_TYPE_COLOR,
  type ArBucketKey,
  type JobTypeKey,
} from "@/lib/design-tokens";

// ---------------------------------------------------------------------------
// Token re-exports (typed)
// ---------------------------------------------------------------------------

export const CHART_TOKENS = {
  series: CHART_COLORS,
  jobType: JOB_TYPE_COLOR,
  arBucket: AR_BUCKET_COLOR,
} as const;

/** Series slot keys, in recommended presentation order. chart-5 (rose) reserved for negatives. */
const SERIES_ORDER: Array<keyof typeof CHART_COLORS> = [1, 2, 3, 4, 6, 7];
const NEGATIVE_SLOT: keyof typeof CHART_COLORS = 5;

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

/**
 * Color for series at index `i`. Cycles through chart-1, -2, -3, -4, -6, -7 —
 * chart-5 (rose) is skipped. Pass `negative: true` to route to chart-5 explicitly.
 */
export function seriesColorByIndex(i: number, opts?: { negative?: boolean }): string {
  if (opts?.negative) return CHART_COLORS[NEGATIVE_SLOT];
  const slot =
    SERIES_ORDER[((i % SERIES_ORDER.length) + SERIES_ORDER.length) % SERIES_ORDER.length];
  return CHART_COLORS[slot];
}

/** Color for a job type. Falls back to the "unknown" slot for unmapped keys. */
export function colorForJobType(key: string): string {
  const k = (key in JOB_TYPE_COLOR ? key : "unknown") as JobTypeKey;
  return JOB_TYPE_COLOR[k];
}

/** Color for an A/R aging bucket. */
export function colorForArBucket(bucket: ArBucketKey): string {
  return AR_BUCKET_COLOR[bucket];
}

// ---------------------------------------------------------------------------
// Presentation defaults — spread directly into Recharts components
// ---------------------------------------------------------------------------

/** Default XAxis / YAxis props. Do not recolor axes inline. */
export const AXIS_PROPS = {
  tickLine: false,
  axisLine: false,
  className: "fill-muted-foreground",
  fontSize: 11,
} as const;

/** Default CartesianGrid props — dashed, border-subtle. */
export const GRID_PROPS = {
  stroke: "var(--border)",
  strokeDasharray: "3 3",
  vertical: false,
} as const;

/** Default Tooltip wrapper styles. Spread as `contentStyle` and `cursor`. */
export const TOOLTIP_PROPS = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    boxShadow: "var(--shadow-card-elevated)",
    fontSize: 12,
    color: "var(--card-foreground)",
    padding: "10px 12px",
  },
  cursor: { fill: "var(--muted)", opacity: 0.5 },
  itemStyle: { color: "var(--card-foreground)" },
  labelStyle: { color: "var(--muted-foreground)", fontSize: 11, marginBottom: 4 },
} as const;

/** Default Legend wrapper styles. Spread as `wrapperStyle`. */
export const LEGEND_PROPS = {
  wrapperStyle: {
    fontSize: 12,
    color: "var(--muted-foreground)",
  },
} as const;

/** Color a series up/down against zero. Use for delta bars, profit/loss lines. */
export function toneForDelta(value: number): string {
  if (value > 0) return "var(--success-500)";
  if (value < 0) return "var(--danger-500)";
  return "var(--chart-6)";
}

/** Reference line color — use for target/benchmark markers only. */
export const REFERENCE_LINE_STROKE = "var(--accent-500)";
