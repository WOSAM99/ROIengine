"use client";

import { AlertTriangle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  icon?: LucideIcon;
  title?: string;
  description?: React.ReactNode;
  /** Render a Retry button with this handler. Omit to hide. */
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Something went wrong",
  description = "Try again in a moment. If the problem persists, contact support.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ErrorStateProps) {
  return (
    <Card
      asPanel
      role="alert"
      className={cn("flex flex-col items-start gap-4 p-8 sm:p-10", className)}
    >
      <span
        aria-hidden
        className="bg-danger-50 text-danger-700 ring-danger-200/60 flex size-10 shrink-0 items-center justify-center rounded-xl ring-1"
      >
        <Icon className="size-5" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-foreground text-lg font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="text-muted-foreground text-sm break-words">{description}</p>
      </div>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </Card>
  );
}
