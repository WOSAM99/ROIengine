/**
 * Orchestration layer: recomputes the "All uploads" aggregate narrative for a company
 * and persists it onto Company.allInsightsNarrative.
 *
 * Triggered at:
 *   - Upload import (POST /api/uploads) — alongside per-upload narrative
 *   - Upload delete (DELETE /api/uploads/[id]) — after the upload row is removed
 *
 * Never triggered on dashboard read.
 *
 * Privacy contract (see lib/insights/narrate.ts): only aggregates cross the AI boundary.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { computeMetrics, ALL_UPLOADS } from "@/lib/metrics/engine";
import { narrateInsights } from "@/lib/insights/narrate";
import { logger } from "@/lib/logger";

export async function refreshAllUploadsNarrative(companyId: string): Promise<void> {
  try {
    const metrics = await computeMetrics({ companyId, uploadId: ALL_UPLOADS });

    if (!metrics || metrics.topInsights.items.length === 0) {
      // No uploads remaining (or no insights to narrate) — null the cache so the
      // dashboard renders rule-based text only / empty state.
      await db.company.update({
        where: { id: companyId },
        data: {
          // Field added in migration 20260421130000. Cast until generated types catch up.
          ...({ allInsightsNarrative: Prisma.DbNull } as unknown as Prisma.CompanyUpdateInput),
        },
      });
      return;
    }

    const map = await narrateInsights({
      insights: metrics.topInsights.items,
      metrics,
    });

    await db.company.update({
      where: { id: companyId },
      data: {
        ...({
          allInsightsNarrative: map as Prisma.InputJsonValue,
        } as unknown as Prisma.CompanyUpdateInput),
      },
    });
  } catch (error) {
    logger.error("refreshAllUploadsNarrative failed", {
      companyId,
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail silent — the narrative cache simply stays at its previous value.
  }
}
