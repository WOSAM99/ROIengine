import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /**
   * `card` — solid surface with shadow. Use for primary-content empty states (dashboard).
   * `dashed` — dashed outline on tinted bg. Use for invitational / call-to-action empty states (lists).
   */
  variant?: "card" | "dashed";
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "card",
  className,
}: EmptyStateProps) {
  const content = (
    <>
      {Icon && (
        <span
          aria-hidden
          className="bg-accent-50 text-accent-700 ring-accent-200/60 flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
        >
          <Icon className="size-5" />
        </span>
      )}
      <div className="space-y-1.5">
        <h2 className="text-foreground text-lg font-semibold tracking-[-0.01em]">{title}</h2>
        {description && <p className="text-muted-foreground text-sm break-words">{description}</p>}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </>
  );

  if (variant === "dashed") {
    return (
      <div
        className={cn(
          "border-border/80 bg-muted/30 flex flex-col items-center gap-4 rounded-2xl border border-dashed p-10 text-center",
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <Card asPanel className={cn("flex flex-col items-start gap-4 p-8 sm:p-10", className)}>
      {content}
    </Card>
  );
}
