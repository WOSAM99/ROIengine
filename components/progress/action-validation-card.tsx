import { CheckCircle2, Minus, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionOutcome, ActionValidation } from "@/lib/progress/action-validation";

type Props = {
  validations: ActionValidation[];
};

function OutcomeIcon({ outcome }: { outcome: ActionOutcome }) {
  if (outcome === "improved")
    return <CheckCircle2 className="text-success-600 mt-0.5 h-4 w-4 shrink-0" />;
  if (outcome === "declined")
    return <TrendingDown className="text-danger-600 mt-0.5 h-4 w-4 shrink-0" />;
  return <Minus className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />;
}

function messageClass(outcome: ActionOutcome): string {
  if (outcome === "improved") return "text-success-700";
  if (outcome === "declined") return "text-danger-700";
  return "text-muted-foreground";
}

export function ActionValidationCard({ validations }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Did Last Week&apos;s Actions Work?</CardTitle>
        <CardDescription>
          Whether the areas we flagged last period actually improved this period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {validations.map((v) => (
            <li key={v.key} className="border-border rounded-xl border p-4">
              <div className="flex gap-3">
                <OutcomeIcon outcome={v.outcome} />
                <div className="min-w-0 space-y-1">
                  <p className={`text-sm font-medium ${messageClass(v.outcome)}`}>{v.message}</p>
                  {v.priorTitle && (
                    <p className="text-muted-foreground text-xs">
                      Last week&apos;s priority: {v.priorTitle}
                    </p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
