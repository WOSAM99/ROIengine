import { cn } from "@/lib/utils";

export type MetricAccentColor =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "slate"
  | "primary";

type MetricCardProps = {
  label: string;
  value: string;
  sublabel?: string;
  accent?: MetricAccentColor;
  /** When true, renders as a full gradient hero card (for the single most important metric). */
  hero?: boolean;
};

const EDGE_BG: Record<MetricAccentColor, string> = {
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  info: "bg-info-500",
  accent: "bg-accent-500",
  slate: "bg-chart-6",
  primary: "bg-primary",
};

export function MetricCard({
  label,
  value,
  sublabel,
  accent = "accent",
  hero = false,
}: MetricCardProps) {
  if (hero) {
    return (
      <div className="bg-gradient-primary shadow-primary-glow relative flex flex-col gap-2 overflow-hidden rounded-2xl p-6 text-white transition-transform duration-200 hover:-translate-y-0.5">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_70%)] opacity-[0.08]"
        />
        <span className="relative text-[11px] font-semibold tracking-wider text-white/80 uppercase">
          {label}
        </span>
        <span className="relative font-mono text-4xl leading-none font-bold tabular-nums">
          {value}
        </span>
        {sublabel && <span className="relative text-xs text-white/80">{sublabel}</span>}
      </div>
    );
  }

  return (
    <div className="shadow-card hover:shadow-card-hover bg-card relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-black/5 p-6 transition-all duration-200 hover:-translate-y-0.5">
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", EDGE_BG[accent])} />
      <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </span>
      <span className="font-mono text-3xl leading-none font-bold tabular-nums">{value}</span>
      {sublabel && <span className="text-muted-foreground text-xs">{sublabel}</span>}
    </div>
  );
}
