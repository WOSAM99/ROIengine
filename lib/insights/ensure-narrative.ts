/**
 * Backfill-on-view: lazily generate the AI narrative for a scope (a single
 * upload or the all-uploads aggregate) the FIRST time it is viewed without one.
 *
 * User directive (2026-05-27): "for old data, if the AI response is not present,
 * get it from AI and store it in the DB — but make sure not to call again and
 * again. Only for not-generated data."
 *
 * Guarantees (so the AI is never called twice for the same scope):
 *   - Only runs when the stored value is NULL (never generated). A stored value —
 *     including an empty `{}` written after a prior attempt — short-circuits the call.
 *   - After a real attempt, a non-null map (possibly `{}`) is persisted, so the
 *     NULL guard never re-fires on later views.
 *   - In-process de-duplication keyed by scope collapses concurrent first-views
 *     into a single API call.
 *   - No ANTHROPIC_API_KEY → no call at all; the value stays NULL so it can still
 *     be backfilled later once a key is configured (no cost, no wasted attempt).
 *
 * Approval: AI_DOCS/memory/ai-cost-approvals.md → "Backfill-on-view AI Narrative".
 *
 * Note: this performs DB writes from a Server Component data path. It is safe
 * because the dashboard route is already dynamic (auth + searchParams) and the
 * write is idempotent and one-shot per scope.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { ALL_UPLOADS, type ComputeMetricsInput } from "@/lib/metrics/engine";
import { buildUploadNarrative } from "@/lib/insights/build-upload-narrative";
import { refreshAllUploadsNarrative } from "@/lib/insights/aggregate-narrative";
import { logger } from "@/lib/logger";

/** In-flight backfills keyed by scope, so two concurrent first-views share one call. */
const inFlight = new Map<string, Promise<void>>();

function dedupe(key: string, run: () => Promise<void>): Promise<void> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = run().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/**
 * Ensure the narrative for the given scope exists, generating it once if missing.
 * Fail-silent: any error is logged and swallowed — the dashboard still renders
 * with rule-based fallback text.
 */
export async function ensureScopeNarrative(input: ComputeMetricsInput): Promise<void> {
  // No key → never call. Leave NULL so a later run can still backfill once configured.
  if (!isAnthropicConfigured()) return;

  try {
    if (input.uploadId === ALL_UPLOADS) {
      await dedupe(`agg:${input.companyId}`, () => backfillAggregate(input.companyId));
      return;
    }

    // Resolve to a concrete upload row (the explicit id, or the latest READY one).
    const target = input.uploadId
      ? await db.upload.findFirst({
          where: { id: input.uploadId, companyId: input.companyId },
          select: { id: true },
        })
      : await db.upload.findFirst({
          where: { companyId: input.companyId, status: "READY" },
          orderBy: { uploadedAt: "desc" },
          select: { id: true },
        });

    if (!target) return;
    await dedupe(`upl:${target.id}`, () => backfillUpload(input.companyId, target.id));
  } catch (error) {
    logger.error("ensureScopeNarrative failed", {
      companyId: input.companyId,
      uploadId: input.uploadId ?? "(latest)",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function backfillAggregate(companyId: string): Promise<void> {
  const company = (await db.company.findUnique({ where: { id: companyId } })) as
    | ({ allInsightsNarrative?: unknown } & { id: string })
    | null;
  if (!company) return;
  // Already generated (including a prior empty `{}` attempt) → never re-call.
  if (company.allInsightsNarrative != null) return;

  // refreshAllUploadsNarrative computes + persists Company.allInsightsNarrative
  // (a non-null map, possibly `{}`), so the guard above blocks all future calls.
  await refreshAllUploadsNarrative(companyId);
}

async function backfillUpload(companyId: string, uploadId: string): Promise<void> {
  const row = (await db.upload.findUnique({ where: { id: uploadId } })) as
    | ({ insightsNarrative?: unknown } & { id: string })
    | null;
  if (!row) return;
  // Already generated (including a prior empty `{}` attempt) → never re-call.
  if (row.insightsNarrative != null) return;

  const map = await buildUploadNarrative(companyId, uploadId);
  // null = compute failed before any AI call — leave NULL, a later view may retry.
  if (map === null) return;

  // Persist even an empty `{}` so the scope counts as "attempted" and never re-calls.
  await db.upload.update({
    where: { id: uploadId },
    data: {
      ...({ insightsNarrative: map as Prisma.InputJsonValue } as Prisma.UploadUpdateInput),
    },
  });
}
