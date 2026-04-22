import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-input bg-card h-10 w-full min-w-0 rounded-lg border px-3 text-sm transition-all outline-none",
        "selection:bg-accent selection:text-accent-foreground",
        "placeholder:text-muted-foreground/60",
        "focus-visible:border-accent focus-visible:shadow-[0_0_0_3px_oklch(0.56_0.22_290_/_0.18)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:shadow-[0_0_0_3px_oklch(0.6_0.22_20_/_0.18)]",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
