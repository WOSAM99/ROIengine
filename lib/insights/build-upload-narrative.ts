/**
 * Builds the merged AI-narrative map for a SINGLE upload scope:
 *   1. Top-insights narration
 *   2. Executive Priority Header (__executive__)
 *   3. Weekly Priorities (__weekly__)
 *
 * Shared by:
 *   - Upload import (POST /api/uploads) — generates at import time.
 *   - Backfill-on-view (lib/insights/ensure-narrative.ts) — generates once for
 *     old uploads whose `insightsNarrative` is still NULL.
 *
 * Returns the merged map (possibly an empty `{}` when there is nothing to
 * narrate), or `null` only on a catastrophic compute failure. A non-null `{}`
 * is intentionally meaningful: the caller persists it so the scope counts as
 * "narration attempted" and is never re-narrated.
 *
 * Individual narration failures are catch-and-continue — fail-silent per
 * lib/insights/narrate.ts. Privacy contract (aggregates only) is enforced by
 * the individual narrate functions.
 */

import { computeMetrics } from "@/lib/metrics/engine";
import { computeConstraints } from "@/lib/metrics/constraint";
import { narrateInsights } from "@/lib/insights/narrate";
import { narrateExecutive } from "@/lib/insights/narrate-executive";
import { narrateWeeklyPriorities } from "@/lib/insights/narrate-weekly";
import { logger } from "@/lib/logger";

export async function buildUploadNarrative(
  companyId: string,
  uploadId: string,
): Promise<Record<string, unknown> | null> {
  try {
    const metrics = await computeMetrics({ companyId, uploadId });
    if (!metrics) return null;

    const narrativeMap: Record<string, unknown> = {};

    // 1. Top-insights narration
    if (metrics.topInsights.items.length > 0) {
      const insightMap = await narrateInsights({
        insights: metrics.topInsights.items,
        metrics,
      });
      Object.assign(narrativeMap, insightMap);
    }

    // 2 & 3. Executive Priority + Weekly Priorities
    const { primary, weeklyPriorities } = computeConstraints(metrics);

    if (primary) {
      const execResult = await narrateExecutive({ primary, metrics });
      if (execResult) {
        narrativeMap["__executive__"] = {
          constraintType: primary.constraintType,
          ...execResult,
        };
      }
    }

    if (weeklyPriorities.items.length > 0) {
      const weeklyResult = await narrateWeeklyPriorities({
        priorities: weeklyPriorities.items,
        metrics,
      });
      if (weeklyResult) {
        narrativeMap["__weekly__"] = weeklyResult;
      }
    }

    return narrativeMap;
  } catch (error) {
    logger.error("Narrative build failed", {
      uploadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
