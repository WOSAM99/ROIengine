/**
 * Builds the merged AI-narrative map for a SINGLE upload scope:
 *   1. Top-insights narration
 *   2. Executive Priority Header (__executive__)
 *   3. Weekly Priorities (__weekly__)
 *
 * Shared by:
 *   - Upload import (POST /api/uploads) — generates at import time.
 *   - Backfill-on-view (lib/insights/ensure-narrative.ts) — generates for old
 *     uploads whose `insightsNarrative` is missing or previously failed.
 *
 * Returns `{ status, map }` (see narrate-all.ts for the status meaning) or
 * `null` only on a catastrophic compute failure (metrics could not be computed).
 * The caller attaches the `__meta__` marker (attachMeta) and persists.
 */

import { computeMetrics } from "@/lib/metrics/engine";
import { narrateAll } from "@/lib/insights/narrate-all";
import type { NarrativeStatus } from "@/lib/insights/narrative-meta";
import { logger } from "@/lib/logger";

export type BuildNarrativeResult = { status: NarrativeStatus; map: Record<string, unknown> } | null;

export async function buildUploadNarrative(
  companyId: string,
  uploadId: string,
): Promise<BuildNarrativeResult> {
  try {
    const metrics = await computeMetrics({ companyId, uploadId });
    if (!metrics) return null;
    return await narrateAll(metrics);
  } catch (error) {
    logger.error("[AI] narrative build failed", {
      uploadId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
