"use client";

import { useState, useTransition } from "react";
import { Gauge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/ui/form-error";

type TargetMarginFormProps = {
  /** Current company default target margin as a fraction 0..1, or null when unset. */
  initialTargetMargin: number | null;
};

const FALLBACK_FRACTION = 0.3;

export function TargetMarginForm({ initialTargetMargin }: TargetMarginFormProps) {
  const [pct, setPct] = useState<number>(
    Math.round((initialTargetMargin ?? FALLBACK_FRACTION) * 100),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError("Enter a whole number between 0 and 100.");
      return;
    }
    const fraction = pct / 100;
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/target-margin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetMargin: fraction }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = body.error ?? "Failed to save target margin";
          setError(msg);
          toast.error(msg);
          return;
        }
        toast.success(`Default target margin set to ${pct}%.`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to save target margin";
        setError(msg);
        toast.error(msg);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="text-accent-700 flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase">
        <Gauge className="size-3.5" />
        Target margin
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="defaultTargetMargin" className="text-sm font-medium">
          Company default
        </Label>
        <div className="relative max-w-[200px]">
          <Input
            id="defaultTargetMargin"
            type="number"
            step="1"
            min="0"
            max="100"
            value={pct}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!Number.isFinite(next)) return;
              setPct(Math.max(0, Math.min(100, next)));
            }}
            className="pr-8 font-mono"
          />
          <span
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm"
          >
            %
          </span>
        </div>
        <p className="text-muted-foreground text-[11px]">
          New uploads use this value by default. Each upload can override it on the Map step.
        </p>
      </div>
      <FormError message={error} />
      <div className="flex justify-end">
        <Button type="submit" variant="accent" disabled={isPending}>
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
