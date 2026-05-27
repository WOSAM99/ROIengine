/**
 * Orchestration layer: recomputes the "All uploads" aggregate narrative for a company
 * and persists it onto Company.allInsightsNarrative (with a __meta__ marker).
 *
 * Triggered at:
 *   - Upload import (POST /api/uploads) — alongside per-upload narrative
 *   - Upload delete (DELETE /api/uploads/[id]) — after the upload row is removed
 *   - Backfill-on-view (lib/insights/ensure-narrative.ts) — when the aggregate is
 *     missing or previously failed
 *
 * Always regenerates when called (callers decide WHETHER to call). The aggregate
 * metrics themselves are recomputed fresh from every READY upload on each call,
 * so the report always reflects all current files.
 *
 * Privacy contract (see lib/insights/narrate.ts): only aggregates cross the AI boundary.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { computeMetrics, ALL_UPLOADS } from "@/lib/metrics/engine";
import { narrateAll } from "@/lib/insights/narrate-all";
import { attachMeta, readPriorAttempts, type NarrativeStatus } from "@/lib/insights/narrative-meta";
import { logger } from "@/lib/logger";

export async function refreshAllUploadsNarrative(
  companyId: string,
): Promise<{ status: NarrativeStatus } | null> {
  try {
    const metrics = await computeMetrics({ companyId, uploadId: ALL_UPLOADS });

    if (!metrics) {
      // No READY uploads (e.g. last one deleted) → clear the cached narrative.
      await db.company.update({
        where: { id: companyId },
        data: {
          ...({ allInsightsNarrative: Prisma.DbNull } as unknown as Prisma.CompanyUpdateInput),
        },
      });
      return null;
    }

    const prior = (await db.company.findUnique({ where: { id: companyId } })) as
      | ({ allInsightsNarrative?: unknown } & { id: string })
      | null;
    const attempts = readPriorAttempts(prior?.allInsightsNarrative) + 1;

    const { status, map } = await narrateAll(metrics);

    await db.company.update({
      where: { id: companyId },
      data: {
        ...({
          allInsightsNarrative: attachMeta(map, status, attempts) as Prisma.InputJsonValue,
        } as unknown as Prisma.CompanyUpdateInput),
      },
    });
    return { status };
  } catch (error) {
    logger.error("[AI] refreshAllUploadsNarrative failed", {
      companyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
