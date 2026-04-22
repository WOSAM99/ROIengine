/**
 * Design tokens — TypeScript mirror of app/globals.css.
 *
 * Runtime source of truth lives in CSS custom properties; this file is the
 * typed interface code uses. When you update globals.css, update here too.
 */

export const COLORS = {
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  border: "var(--border)",
  primary: "var(--primary)",
  primaryForeground: "var(--primary-foreground)",
  secondary: "var(--secondary)",
  accent: "var(--accent)",
  accentForeground: "var(--accent-foreground)",
  accent50: "var(--accent-50)",
  accent100: "var(--accent-100)",
  accent200: "var(--accent-200)",
  accent500: "var(--accent-500)",
  accent600: "var(--accent-600)",
  accent700: "var(--accent-700)",
  success: "var(--success)",
  success50: "var(--success-50)",
  success100: "var(--success-100)",
  success500: "var(--success-500)",
  success700: "var(--success-700)",
  warning: "var(--warning)",
  warning50: "var(--warning-50)",
  warning100: "var(--warning-100)",
  warning500: "var(--warning-500)",
  warning700: "var(--warning-700)",
  danger: "var(--danger)",
  danger50: "var(--danger-50)",
  danger100: "var(--danger-100)",
  danger500: "var(--danger-500)",
  danger700: "var(--danger-700)",
  info: "var(--info)",
  info50: "var(--info-50)",
  info100: "var(--info-100)",
  info500: "var(--info-500)",
  info700: "var(--info-700)",
  fuchsia500: "var(--fuchsia-500)",
  fuchsia600: "var(--fuchsia-600)",
} as const;

export const CHART_COLORS = {
  1: "var(--chart-1)", // violet
  2: "var(--chart-2)", // emerald
  3: "var(--chart-3)", // cyan
  4: "var(--chart-4)", // amber
  5: "var(--chart-5)", // rose (reserved for negatives only)
  6: "var(--chart-6)", // slate
  7: "var(--chart-7)", // teal
} as const;

export type JobTypeKey = "water" | "mold" | "fire" | "recon" | "cleaning" | "other" | "unknown";

/** Job type → color. fire uses amber, not red, so semantics don't leak into type identity. */
export const JOB_TYPE_COLOR: Record<JobTypeKey, string> = {
  water: CHART_COLORS[3], // cyan
  mold: CHART_COLORS[2], // emerald
  fire: CHART_COLORS[4], // amber (not red)
  recon: CHART_COLORS[1], // violet
  cleaning: CHART_COLORS[7], // teal
  other: CHART_COLORS[6], // slate
  unknown: CHART_COLORS[6],
};

export type ArBucketKey = "Current" | "1-30" | "31-60" | "61-90" | ">90";

export const AR_BUCKET_COLOR: Record<ArBucketKey, string> = {
  Current: "var(--success-500)",
  "1-30": "var(--info-500)",
  "31-60": "var(--warning-500)",
  "61-90": "var(--warning-700)",
  ">90": "var(--danger-500)",
};

/**
 * Gradient class map for A/R aging bars — keeps the platform's primary-gradient
 * (violet → fuchsia) as the dominant visual language, with semantic green and
 * red preserved at the extremes where they carry irreplaceable meaning:
 *   - Current  → success green (positive, paid-up)
 *   - 1-30     → light violet (on-track, within primary family)
 *   - 31-60    → accent violet → fuchsia (the full primary gradient — watch)
 *   - 61-90    → fuchsia (concerning, darker primary terminus)
 *   - >90      → danger red (critical — cash at real write-off risk)
 *
 * Consumed by CashFlowWidget as Tailwind gradient classes.
 */
export const AR_BUCKET_GRADIENT: Record<ArBucketKey, string> = {
  Current: "bg-gradient-to-r from-success-500 to-success-600",
  "1-30": "bg-gradient-to-r from-accent-200 to-accent-500",
  "31-60": "bg-gradient-to-r from-accent-500 to-fuchsia-500",
  "61-90": "bg-gradient-to-r from-fuchsia-500 to-fuchsia-600",
  ">90": "bg-gradient-to-r from-danger-500 to-danger-600",
};

export const AR_BUCKET_HINT: Record<ArBucketKey, string> = {
  Current: "Paid up",
  "1-30": "On track",
  "31-60": "Watch",
  "61-90": "Overdue",
  ">90": "Critical",
};

export const SHADOWS = {
  card: "var(--shadow-card)",
  cardElevated: "var(--shadow-card-elevated)",
  cardHover: "var(--shadow-card-hover)",
  primaryGlow: "var(--shadow-primary-glow)",
} as const;

export const RADII = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.25rem",
} as const;

/** Layout / container tokens — consume via Tailwind classes, but these are documented here. */
export const LAYOUT = {
  pageMaxWidth: "max-w-6xl",
  pagePaddingX: "px-4 sm:px-6 lg:px-8",
  pagePaddingY: "py-6 lg:py-10",
  cardPaddingX: "px-6",
  cardGap: "gap-4 lg:gap-5",
  sectionSpacingY: "space-y-8",
  formFieldSpacingY: "space-y-5",
  labelInputSpacingY: "space-y-1.5",
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
  },
} as const;

export type ToneKey = "success" | "warning" | "danger" | "info" | "accent" | "slate";

/** Used by KpiTile and colored badges. Tailwind classes so components can concat. */
export const TONE_TILE_CLASS: Record<ToneKey, string> = {
  success:
    "bg-gradient-to-br from-success-50 to-success-100/60 text-success-700 ring-1 ring-success-200/60",
  warning:
    "bg-gradient-to-br from-warning-50 to-warning-100/60 text-warning-700 ring-1 ring-warning-200/60",
  danger:
    "bg-gradient-to-br from-danger-50 to-danger-100/60 text-danger-700 ring-1 ring-danger-200/60",
  info: "bg-gradient-to-br from-info-50 to-info-100/60 text-info-700 ring-1 ring-info-200/60",
  accent:
    "bg-gradient-to-br from-accent-50 to-accent-100/60 text-accent-700 ring-1 ring-accent-200/60",
  slate: "bg-muted text-foreground ring-1 ring-border",
};
