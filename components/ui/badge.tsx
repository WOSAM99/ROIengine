import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border border-transparent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-muted",
        destructive: "border-danger-200 bg-danger-50 text-danger-700",
        accent: "border-accent-200 bg-accent-50 text-accent-700",
        success: "border-success-200 bg-success-50 text-success-700",
        warning: "border-warning-200 bg-warning-50 text-warning-700",
        info: "border-info-200 bg-info-50 text-info-700",
        outline: "border-border bg-card text-foreground [a&]:hover:bg-muted",
        ghost: "text-muted-foreground [a&]:hover:bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
