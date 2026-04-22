import { AlertOctagon, AlertTriangle, Sparkles, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  Insight,
  InsightDimension,
  InsightNarrative,
  InsightSeverity,
  TopInsights,
} from "@/lib/metrics/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type TopInsightsWidgetProps = {
  data: TopInsights;
};

const LABEL_FOR: Record<InsightDimension, string> = {
  jobType: "Job Type",
  pm: "PM Variance",
  ar: "A/R Aging",
};

const DIMENSION_ACCENT: Record<InsightDimension, string> = {
  jobType: "bg-accent",
  pm: "bg-info-500",
  ar: "bg-danger-500",
};

const SEVERITY_BADGE: Record<
  InsightSeverity,
  { variant: "destructive" | "warning" | "info"; label: string; Icon: typeof AlertOctagon }
> = {
  critical: { variant: "destructive", label: "Critical", Icon: AlertOctagon },
  high: { variant: "warning", label: "High", Icon: AlertTriangle },
  medium: { variant: "info", label: "Medium", Icon: TrendingDown },
};

export function TopInsightsWidget({ data }: TopInsightsWidgetProps) {
  const totalImpact = data.items.reduce((acc, insight) => acc + Number(insight.estimatedImpact), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1.5">
            <CardTitle>Top Insights</CardTitle>
            <CardDescription className="break-words">
              {data.items.length === 0 ? (
                "No profit leaks detected."
              ) : (
                <>
                  <span className="font-numeric text-foreground font-semibold">
                    {formatMoney(totalImpact)}
                  </span>{" "}
                  in recoverable margin across {data.items.length}{" "}
                  {data.items.length === 1 ? "signal" : "signals"}. Ranked by impact × urgency.
                </>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 pb-4">
        {data.items.length === 0 ? (
          <p className="text-muted-foreground px-6 py-10 text-center text-sm">
            Every job cleared target and nothing is overdue. Keep it up.
          </p>
        ) : (
          <ol className="space-y-3 px-4 sm:px-6">
            {data.items.map((insight, index) =>
              index === 0 ? (
                <HeroInsightRow
                  key={insight.id}
                  insight={insight}
                  rank={index + 1}
                  shareOfTotal={
                    totalImpact === 0 ? 0 : Number(insight.estimatedImpact) / totalImpact
                  }
                />
              ) : (
                <InsightRow
                  key={insight.id}
                  insight={insight}
                  rank={index + 1}
                  shareOfTotal={
                    totalImpact === 0 ? 0 : Number(insight.estimatedImpact) / totalImpact
                  }
                />
              ),
            )}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function HeroInsightRow({
  insight,
  rank,
  shareOfTotal,
}: {
  insight: Insight;
  rank: number;
  shareOfTotal: number;
}) {
  return (
    <li className="bg-gradient-primary shadow-primary-glow relative overflow-hidden rounded-2xl p-5 text-white sm:p-6">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,white,transparent_70%)] opacity-[0.1]"
      />
      <div className="relative grid grid-cols-[auto_1fr_auto] items-start gap-3 sm:gap-4">
        <span className="font-mono text-3xl leading-none font-bold tabular-nums sm:text-4xl">
          #{String(rank).padStart(2, "0")}
        </span>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold tracking-wider text-white/85 uppercase">
              {LABEL_FOR[insight.dimension]}
            </span>
            <SeverityChip severity={insight.severity} hero />
            {shareOfTotal >= 0.2 && (
              <span className="text-[10px] font-semibold tracking-wider text-white/70 uppercase">
                {Math.round(shareOfTotal * 100)}% of total leak
              </span>
            )}
          </div>
          <h3 className="text-[15px] font-semibold break-words sm:text-base">{insight.title}</h3>
          <p className="text-[13px] leading-relaxed break-words text-white/90">{insight.rule}</p>
          <p className="text-[12px] leading-relaxed break-words text-white/75">{insight.detail}</p>
        </div>
        <span className="inline-flex shrink-0 items-center rounded-lg bg-white/15 px-2.5 py-1 font-mono text-sm font-bold text-white tabular-nums sm:text-base">
          {formatMoney(insight.estimatedImpact)}
        </span>
      </div>
      {insight.narrative && (
        <NarrativeBlock narrative={insight.narrative} variant="hero" className="relative mt-4" />
      )}
    </li>
  );
}

function InsightRow({
  insight,
  rank,
  shareOfTotal,
}: {
  insight: Insight;
  rank: number;
  shareOfTotal: number;
}) {
  return (
    <li className="bg-card shadow-card hover:shadow-card-hover relative overflow-hidden rounded-2xl border border-black/5 p-5 transition-shadow duration-200">
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px]", DIMENSION_ACCENT[insight.dimension])}
      />
      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-3 sm:gap-4">
        <span className="text-gradient-primary font-mono text-2xl leading-none font-bold tabular-nums sm:text-3xl">
          #{String(rank).padStart(2, "0")}
        </span>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-accent-700 text-[10px] font-semibold tracking-wider uppercase">
              {LABEL_FOR[insight.dimension]}
            </span>
            <SeverityChip severity={insight.severity} />
            {shareOfTotal >= 0.15 && (
              <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                {Math.round(shareOfTotal * 100)}% of total leak
              </span>
            )}
          </div>
          <h3 className="text-[14px] font-semibold break-words">{insight.title}</h3>
          <p className="text-muted-foreground text-xs leading-relaxed break-words">
            {insight.rule}
          </p>
          <p className="text-muted-foreground/80 text-[11px] leading-relaxed break-words">
            {insight.detail}
          </p>
        </div>
        <span className="bg-danger-50 text-danger-700 inline-flex shrink-0 items-center rounded-lg px-2.5 py-1 font-mono text-sm font-semibold tabular-nums">
          {formatMoney(insight.estimatedImpact)}
        </span>
      </div>
      {insight.narrative && (
        <NarrativeBlock narrative={insight.narrative} variant="default" className="mt-4" />
      )}
    </li>
  );
}

function SeverityChip({ severity, hero = false }: { severity: InsightSeverity; hero?: boolean }) {
  const { variant, label, Icon } = SEVERITY_BADGE[severity];
  if (hero) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase ring-1 ring-white/25">
        <Icon className="size-3" />
        {label}
      </span>
    );
  }
  return (
    <Badge variant={variant}>
      <Icon className="size-3" />
      {label}
    </Badge>
  );
}

function NarrativeBlock({
  narrative,
  variant,
  className,
}: {
  narrative: InsightNarrative;
  variant: "hero" | "default";
  className?: string;
}) {
  const isHero = variant === "hero";
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl p-4",
        isHero
          ? "bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-sm ring-inset"
          : "bg-accent-50/60 text-foreground ring-accent-200/60 ring-1 ring-inset",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-[10px] font-semibold tracking-wider uppercase",
          isHero ? "text-white/85" : "text-accent-700",
        )}
      >
        <Sparkles className="size-3.5" />
        AI insight
      </div>
      <p
        className={cn(
          "text-[13px] leading-relaxed break-words",
          isHero ? "text-white" : "text-foreground",
        )}
      >
        {narrative.explanation}
      </p>
      <div className="space-y-1.5">
        <p
          className={cn(
            "text-[10px] font-semibold tracking-wider uppercase",
            isHero ? "text-white/70" : "text-muted-foreground",
          )}
        >
          Likely root cause
        </p>
        <p
          className={cn(
            "text-[12px] leading-relaxed break-words",
            isHero ? "text-white/90" : "text-foreground/85",
          )}
        >
          {narrative.rootCause}
        </p>
      </div>
      {narrative.recommendations.length > 0 && (
        <div className="space-y-1.5">
          <p
            className={cn(
              "text-[10px] font-semibold tracking-wider uppercase",
              isHero ? "text-white/70" : "text-muted-foreground",
            )}
          >
            Recommended
          </p>
          <ul className="space-y-1">
            {narrative.recommendations.map((rec, i) => (
              <li
                key={`rec-${i}`}
                className={cn(
                  "flex gap-2 text-[12px] leading-relaxed break-words",
                  isHero ? "text-white/90" : "text-foreground/90",
                )}
              >
                <span
                  aria-hidden
                  className={cn("mt-[3px] shrink-0", isHero ? "text-white/60" : "text-accent-600")}
                >
                  →
                </span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
