import { Sparkles, Target, Lightbulb, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiTile } from "@/components/widgets/kpi-tile";
import { CONSTRAINT_LABEL } from "@/lib/metrics/constraint-labels";
import type { ExecutivePriority } from "@/lib/metrics/types";

type ExecutivePriorityWidgetProps = {
  data: ExecutivePriority;
  /** AI narrative is still being generated for this scope. When false, missing
   *  AI text renders a deterministic fallback instead of a perpetual skeleton. */
  aiPending?: boolean;
};

export function ExecutivePriorityWidget({ data, aiPending = false }: ExecutivePriorityWidgetProps) {
  return (
    <section aria-labelledby="executive-priority-heading">
      <Card className="overflow-hidden">
        {/* Accent bar */}
        <div className="from-accent via-primary h-1 w-full bg-gradient-to-r to-fuchsia-500" />

        <CardHeader>
          <p className="text-accent-700 text-[10px] font-semibold tracking-widest uppercase">
            Start Here
          </p>
          <h2
            id="executive-priority-heading"
            className="text-foreground text-xl leading-snug font-bold break-words"
          >
            {data.title}
          </h2>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* KPI chips */}
          {data.kpis.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.kpis.map((kpi) => (
                <KpiTile key={kpi.label} label={kpi.label} value={kpi.value} tone={kpi.tone} />
              ))}
            </div>
          )}

          {/* AI-generated sections — skeleton only while generating; deterministic
              fallback when the AI narrative is unavailable (never loops forever) */}
          {data.directive === null && aiPending ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="space-y-2 pt-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ) : data.directive === null ? (
            <div className="flex gap-3">
              <span className="mt-0.5 shrink-0">
                <Target className="text-accent h-4 w-4" />
              </span>
              <div>
                <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
                  What to do
                </p>
                <p className="text-foreground text-sm font-medium">
                  {CONSTRAINT_LABEL[data.constraintType]}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* What to do */}
              <div className="flex gap-3">
                <span className="mt-0.5 shrink-0">
                  <Target className="text-accent h-4 w-4" />
                </span>
                <div>
                  <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
                    What to do
                  </p>
                  <p className="text-foreground text-sm font-medium">{data.directive}</p>
                </div>
              </div>

              {/* Why it matters */}
              {data.whyItMatters && (
                <div className="flex gap-3">
                  <span className="mt-0.5 shrink-0">
                    <Lightbulb className="text-warning-600 h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-wider uppercase">
                      Why it matters
                    </p>
                    <p className="text-muted-foreground text-sm">{data.whyItMatters}</p>
                  </div>
                </div>
              )}

              {/* How to execute */}
              {data.howToExecute && data.howToExecute.length > 0 && (
                <div className="bg-muted/40 rounded-xl p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <ListChecks className="text-accent h-4 w-4" />
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      How to execute
                    </p>
                    <Sparkles className="text-accent ml-auto h-3 w-3 opacity-60" />
                  </div>
                  <ol className="space-y-2">
                    {data.howToExecute.map((step, i) => (
                      <li key={i} className="text-foreground flex gap-2 text-sm">
                        <span className="text-accent shrink-0 font-semibold tabular-nums">
                          {i + 1}.
                        </span>
                        <span>{step.replace(/^Step \d+:\s*/i, "")}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
