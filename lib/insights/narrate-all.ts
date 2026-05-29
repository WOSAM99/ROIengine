/**
 * Runs the three narration steps over a metrics snapshot and reports a status.
 * Shared by the per-upload builder (build-upload-narrative.ts) and the
 * all-uploads aggregate (aggregate-narrative.ts) so both behave identically.
 *
 * Status:
 *   - "empty"  : nothing to narrate (no insights, no primary constraint, no weekly)
 *   - "failed" : content was EXPECTED but every AI sub-call returned nothing
 *   - "ok"     : at least one section was narrated
 *
 * Fail-silent: each narrate function swallows its own errors and returns empty.
 * Privacy contract (aggregates only — never raw rows) is enforced inside them.
 */

import { computeConstraints } from "@/lib/metrics/constraint";
import { narrateInsights } from "@/lib/insights/narrate";
import { narrateExecutive } from "@/lib/insights/narrate-executive";
import { narrateWeeklyPriorities } from "@/lib/insights/narrate-weekly";
import type { Metrics } from "@/lib/metrics/types";
import type { NarrativeStatus } from "@/lib/insights/narrative-meta";

export async function narrateAll(
  metrics: Metrics,
): Promise<{ status: NarrativeStatus; map: Record<string, unknown> }> {
  const map: Record<string, unknown> = {};

  const { primary, weeklyPriorities } = computeConstraints(metrics);
  const expected =
    metrics.topInsights.items.length > 0 || primary != null || weeklyPriorities.items.length > 0;

  // 1. Top-insights narration
  if (metrics.topInsights.items.length > 0) {
    const insightMap = await narrateInsights({ insights: metrics.topInsights.items, metrics });
    Object.assign(map, insightMap);
  }

  // 2. Executive Priority Header
  if (primary) {
    const exec = await narrateExecutive({ primary, metrics });
    if (exec) {
      map["__executive__"] = { constraintType: primary.constraintType, ...exec };
    }
  }

  // 3. Weekly Priorities
  if (weeklyPriorities.items.length > 0) {
    const weekly = await narrateWeeklyPriorities({ priorities: weeklyPriorities.items, metrics });
    if (weekly) {
      map["__weekly__"] = weekly;
    }
  }

  const hasContent = Object.keys(map).length > 0;
  const status: NarrativeStatus = !expected ? "empty" : hasContent ? "ok" : "failed";
  return { status, map };
}
