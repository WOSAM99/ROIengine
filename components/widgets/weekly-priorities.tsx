import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiTile } from "@/components/widgets/kpi-tile";
import { formatMoney } from "@/lib/format";
import type { WeeklyPriorities, WeeklyPriorityStatus } from "@/lib/metrics/types";

type WeeklyPrioritiesWidgetProps = {
  data: WeeklyPriorities;
};

const STATUS_BADGE_VARIANT: Record<
  WeeklyPriorityStatus,
  "destructive" | "warning" | "info" | "success"
> = {
  Critical: "destructive",
  High: "warning",
  Moderate: "info",
  Resolved: "success",
};

export function WeeklyPrioritiesWidget({ data }: WeeklyPrioritiesWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Weekly Priorities</CardTitle>
          <Sparkles className="text-accent h-3.5 w-3.5 opacity-70" />
        </div>
        <CardDescription>What leadership should focus on this week</CardDescription>
      </CardHeader>

      <CardContent>
        {data.items.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            Upload data to generate weekly priorities.
          </p>
        ) : (
          <ol className="space-y-4">
            {data.items.map((item, index) => (
              <li key={item.id} className="border-border space-y-3 rounded-xl border p-4">
                {/* Header row: rank + status badge + impact */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground font-mono text-xs font-bold tabular-nums">
                    #{index + 1}
                  </span>
                  <Badge variant={STATUS_BADGE_VARIANT[item.status]}>{item.status}</Badge>
                  <div className="ml-auto shrink-0">
                    <KpiTile
                      label="Est. impact"
                      value={formatMoney(item.estimatedImpact)}
                      tone={
                        item.status === "Critical"
                          ? "danger"
                          : item.status === "High"
                            ? "warning"
                            : "slate"
                      }
                      className="px-2 py-1.5 text-xs"
                    />
                  </div>
                </div>

                {/* Title */}
                {item.title === null ? (
                  <Skeleton className="h-4 w-48" />
                ) : (
                  <p className="text-foreground text-sm font-semibold">{item.title}</p>
                )}

                {/* Reason */}
                {item.reason === null ? (
                  <Skeleton className="h-3.5 w-full" />
                ) : (
                  <p className="text-muted-foreground text-xs">{item.reason}</p>
                )}

                {/* Expected outcome */}
                {item.expectedOutcome !== null && (
                  <p className="text-success-700 text-xs font-medium">→ {item.expectedOutcome}</p>
                )}

                {/* Actions */}
                {item.actions !== null && item.actions.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {item.actions.map((action, ai) => (
                      <li key={ai} className="text-muted-foreground flex gap-2 text-xs">
                        <span className="text-accent shrink-0">→</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Skeleton for actions when AI fields are not yet generated */}
                {item.actions === null && (
                  <div className="space-y-1.5 pt-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
