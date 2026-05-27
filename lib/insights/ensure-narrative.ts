/**
 * Backfill AI narratives for a scope (a single upload or the all-uploads
 * aggregate) the first time it is viewed without a usable one — and retry a
 * bounded number of times if a prior attempt failed.
 *
 * This is now driven by a client trigger (POST /api/insights/backfill), NOT by
 * blocking the page render. The page renders instantly with rule-based fallback
 * text; the client calls ensureScopeNarrative and refreshes when content lands.
 *
 * Guarantees (cost-safe — see .claude/rules/ai-safety-rules.md):
 *   - "ok"/"empty" scopes are never re-narrated (the __meta__ marker records it).
 *   - "failed" scopes retry until MAX_NARRATIVE_ATTEMPTS, then stop.
 *   - Legacy empty `{}` (the old stuck-failure bug) is treated as retryable.
 *   - In-process de-duplication collapses concurrent first-views into one call.
 *   - No ANTHROPIC_API_KEY → no call at all (logged, never silent).
 *
 * Approval: AI_DOCS/memory/ai-cost-approvals.md → "Backfill-on-view AI Narrative".
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { ALL_UPLOADS, type ComputeMetricsInput } from "@/lib/metrics/engine";
import { buildUploadNarrative } from "@/lib/insights/build-upload-narrative";
import { refreshAllUploadsNarrative } from "@/lib/insights/aggregate-narrative";
import {
  attachMeta,
  narrativeNeedsGeneration,
  readPriorAttempts,
} from "@/lib/insights/narrative-meta";
import { logger } from "@/lib/logger";

/** Result of a backfill attempt. `refreshed` is true only when NEW content landed. */
export type BackfillResult = { refreshed: boolean };

/** In-flight backfills keyed by scope, so two concurrent first-views share one call. */
const inFlight = new Map<string, Promise<BackfillResult>>();

function dedupe(key: string, run: () => Promise<BackfillResult>): Promise<BackfillResult> {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = run().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

type ResolvedScope = { kind: "all" } | { kind: "upload"; uploadId: string } | { kind: "none" };

/** Map a scope input to a concrete target (resolves "latest" + checks ownership). */
async function resolveScope(input: ComputeMetricsInput): Promise<ResolvedScope> {
  if (input.uploadId === ALL_UPLOADS) return { kind: "all" };

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

  return target ? { kind: "upload", uploadId: target.id } : { kind: "none" };
}

/** Read the stored narrative JSON for a resolved scope (no AI call). */
async function loadStored(companyId: string, scope: ResolvedScope): Promise<unknown> {
  if (scope.kind === "all") {
    const company = (await db.company.findUnique({ where: { id: companyId } })) as
      | ({ allInsightsNarrative?: unknown } & { id: string })
      | null;
    return company?.allInsightsNarrative ?? null;
  }
  if (scope.kind === "upload") {
    const row = (await db.upload.findUnique({ where: { id: scope.uploadId } })) as
      | ({ insightsNarrative?: unknown } & { id: string })
      | null;
    return row?.insightsNarrative ?? null;
  }
  return null;
}

/**
 * Cheap, AI-free check used by server pages to decide whether to mount the
 * client backfill trigger. Returns false when there's no key or nothing to do.
 */
export async function scopeNeedsNarrative(input: ComputeMetricsInput): Promise<boolean> {
  if (!isAnthropicConfigured()) return false;
  const scope = await resolveScope(input);
  if (scope.kind === "none") return false;
  const stored = await loadStored(input.companyId, scope);
  return narrativeNeedsGeneration(stored);
}

/**
 * Ensure the narrative for the given scope exists, generating it once (or
 * retrying a failed scope). Fail-silent: errors are logged and swallowed.
 */
export async function ensureScopeNarrative(input: ComputeMetricsInput): Promise<BackfillResult> {
  const scopeLabel = input.uploadId === ALL_UPLOADS ? "all" : (input.uploadId ?? "(latest)");

  // No key → never call. Logged (not silent): a missing key is the #1 reason old
  // data shows no AI text.
  if (!isAnthropicConfigured()) {
    logger.warn("[AI backfill] skipped — ANTHROPIC_API_KEY not configured", { scope: scopeLabel });
    return { refreshed: false };
  }

  try {
    const scope = await resolveScope(input);
    if (scope.kind === "none") {
      logger.info("[AI backfill] no READY upload to narrate — skipped", { scope: scopeLabel });
      return { refreshed: false };
    }
    if (scope.kind === "all") {
      return await dedupe(`agg:${input.companyId}`, () => backfillAggregate(input.companyId));
    }
    return await dedupe(`upl:${scope.uploadId}`, () =>
      backfillUpload(input.companyId, scope.uploadId),
    );
  } catch (error) {
    logger.error("[AI backfill] ensureScopeNarrative failed", {
      companyId: input.companyId,
      scope: scopeLabel,
      error: error instanceof Error ? error.message : String(error),
    });
    return { refreshed: false };
  }
}

async function backfillAggregate(companyId: string): Promise<BackfillResult> {
  const stored = await loadStored(companyId, { kind: "all" });
  if (!narrativeNeedsGeneration(stored)) {
    logger.info("[AI backfill] aggregate (ALL) already narrated — reusing stored value", {
      companyId,
    });
    return { refreshed: false };
  }

  const attempt = readPriorAttempts(stored) + 1;
  logger.info("[AI backfill] generating aggregate (ALL) narrative — calling AI", {
    companyId,
    attempt,
  });

  const result = await refreshAllUploadsNarrative(companyId);
  if (result?.status === "ok") {
    logger.info("[AI backfill] aggregate (ALL) narrative persisted", { companyId });
    return { refreshed: true };
  }
  logger.info("[AI backfill] aggregate (ALL) narrative finished without content", {
    companyId,
    status: result?.status ?? "none",
  });
  return { refreshed: false };
}

async function backfillUpload(companyId: string, uploadId: string): Promise<BackfillResult> {
  const stored = await loadStored(companyId, { kind: "upload", uploadId });
  if (!narrativeNeedsGeneration(stored)) {
    logger.info("[AI backfill] upload already narrated — reusing stored value", { uploadId });
    return { refreshed: false };
  }

  const attempt = readPriorAttempts(stored) + 1;
  logger.info("[AI backfill] generating upload narrative — calling AI", { uploadId, attempt });

  const result = await buildUploadNarrative(companyId, uploadId);
  if (result === null) {
    // Compute failed before any AI call — leave NULL so a later view can retry.
    logger.warn("[AI backfill] compute failed before AI call — left NULL for retry", { uploadId });
    return { refreshed: false };
  }

  const { status, map } = result;
  await db.upload.update({
    where: { id: uploadId },
    data: {
      ...({
        insightsNarrative: attachMeta(map, status, attempt) as Prisma.InputJsonValue,
      } as Prisma.UploadUpdateInput),
    },
  });

  if (status === "ok") {
    logger.info("[AI backfill] persisted upload narrative", {
      uploadId,
      sections: Object.keys(map).length,
    });
    return { refreshed: true };
  }
  if (status === "empty") {
    logger.info("[AI backfill] nothing to narrate for upload — marked empty (no retry)", {
      uploadId,
    });
  } else {
    logger.warn(
      "[AI backfill] AI returned no content (status=failed) — will retry on next view up to the cap",
      { uploadId, attempt },
    );
  }
  return { refreshed: false };
}
