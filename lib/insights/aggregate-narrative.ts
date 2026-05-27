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
import { computeConstraints } from "@/lib/metrics/constraint";
import { narrateInsights } from "@/lib/insights/narrate";
import { narrateExecutive } from "@/lib/insights/narrate-executive";
import { narrateWeeklyPriorities } from "@/lib/insights/narrate-weekly";
import { logger } from "@/lib/logger";

export async function refreshAllUploadsNarrative(companyId: string): Promise<void> {
  try {
    const metrics = await computeMetrics({ companyId, uploadId: ALL_UPLOADS });

    if (!metrics) {
      await db.company.update({
        where: { id: companyId },
        data: {
          ...({ allInsightsNarrative: Prisma.DbNull } as unknown as Prisma.CompanyUpdateInput),
        },
      });
      return;
    }

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

    await db.company.update({
      where: { id: companyId },
      data: {
        ...({
          allInsightsNarrative: narrativeMap as Prisma.InputJsonValue,
        } as unknown as Prisma.CompanyUpdateInput),
      },
    });
  } catch (error) {
    logger.error("refreshAllUploadsNarrative failed", {
      companyId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
