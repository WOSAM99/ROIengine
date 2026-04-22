/**
 * Card — the project's canonical surface primitive.
 *
 * Padding model is split-by-slot:
 *   <Card>        → supplies vertical padding (py-6) and a 4px gap between slots
 *   <CardHeader>  → supplies horizontal padding (px-6)
 *   <CardContent> → supplies horizontal padding (px-6)
 *   <CardFooter>  → supplies horizontal padding (px-6)
 *
 * This split lets dividers (border-t, border-b) span the full card width while
 * the content remains inset. When a card has only ONE body slot (empty states,
 * single-panel settings, hero pages), use the `asPanel` prop to collapse the
 * split into a unified `p-6` wrapper instead — no more redundant CardContent.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

type CardProps = React.ComponentProps<"div"> & {
  /** Apply unified `p-6` instead of the split py-6 / px-6 slot model. */
  asPanel?: boolean;
};

function Card({ className, asPanel = false, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-panel={asPanel || undefined}
      className={cn(
        "shadow-card bg-card text-card-foreground flex flex-col gap-4 rounded-2xl border border-black/5",
        asPanel ? "p-6" : "py-6",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        "group-data-[panel]:px-0", // collapse horizontal padding when inside an asPanel Card
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base leading-tight font-semibold tracking-[-0.01em]", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
export type { CardProps };
