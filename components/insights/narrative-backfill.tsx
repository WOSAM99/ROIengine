"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

type NarrativeBackfillProps = {
  /** "all" for the aggregate, or a concrete upload id. */
  scope: string;
  /** Whether this scope still needs AI narration (server-computed, AI-free check). */
  enabled: boolean;
};

/**
 * Non-blocking AI narrative backfill. The page renders instantly with rule-based
 * fallback text; this component fires the (slow) AI generation in the background
 * via POST /api/insights/backfill and refreshes the route once content lands.
 *
 * Fires at most once per mount (ref guard). Only refreshes when the server
 * reports NEW content was generated — failures don't loop; they retry on the
 * next page load up to the attempt cap enforced server-side.
 */
export function NarrativeBackfill({ scope, enabled }: NarrativeBackfillProps) {
  const router = useRouter();
  const fired = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled || !scope || fired.current) return;
    fired.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/insights/backfill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope }),
        });
        const data = (await res.json().catch(() => null)) as { refreshed?: boolean } | null;
        if (!cancelled && data?.refreshed) {
          // New content landed — pull it in. The refreshed render sets enabled=false.
          router.refresh();
          return;
        }
      } catch {
        // Fail-silent: the page already shows rule-based fallback text.
      }
      if (!cancelled) setDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, scope, router]);

  if (!enabled || done) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="text-muted-foreground flex items-center gap-2 text-sm"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>Generating AI insights…</span>
    </div>
  );
}
