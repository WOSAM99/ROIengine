/**
 * Shared status + retry bookkeeping for AI narratives.
 *
 * A narrative scope (one upload, or the all-uploads aggregate) stores its AI
 * result as a JSON map. We embed a reserved `__meta__` key so a later view can
 * tell WHY a scope has no content and whether regenerating is worthwhile:
 *
 *   - "ok"     — content was produced. Never regenerate on view.
 *   - "empty"  — nothing to narrate (no insights / constraints). Never regenerate.
 *   - "failed" — content was expected but every AI sub-call errored / returned
 *                empty. Regenerate on view until MAX_NARRATIVE_ATTEMPTS, then stop
 *                (cost guard — see .claude/rules/ai-safety-rules.md).
 *
 * `__meta__` is invisible to every narrative reader (`parseNarrativeMap`,
 * `parseExecutiveCached`, `parseWeeklyCached` all skip non-conforming keys), so
 * it is safe to co-store alongside the insight / executive / weekly entries.
 *
 * Legacy rows (written before this marker existed) have no `__meta__`:
 *   - non-empty map  → treated as "ok" (has content) → never regenerate.
 *   - empty `{}` map → the stuck-failure bug → regenerate (attempt count resets).
 */

export const MAX_NARRATIVE_ATTEMPTS = 3;
export const META_KEY = "__meta__";

export type NarrativeStatus = "ok" | "empty" | "failed";

export type NarrativeMeta = {
  status: NarrativeStatus;
  attempts: number;
  at: string;
};

/** Attach (or replace) the meta marker on a narrative map. */
export function attachMeta(
  map: Record<string, unknown>,
  status: NarrativeStatus,
  attempts: number,
): Record<string, unknown> {
  const meta: NarrativeMeta = { status, attempts, at: new Date().toISOString() };
  return { ...map, [META_KEY]: meta };
}

function readMeta(stored: unknown): NarrativeMeta | null {
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return null;
  const meta = (stored as Record<string, unknown>)[META_KEY];
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  if (m.status !== "ok" && m.status !== "empty" && m.status !== "failed") return null;
  return {
    status: m.status,
    attempts: typeof m.attempts === "number" ? m.attempts : 1,
    at: typeof m.at === "string" ? m.at : "",
  };
}

/** Total prior generation attempts recorded for a scope (0 if none / legacy). */
export function readPriorAttempts(stored: unknown): number {
  return readMeta(stored)?.attempts ?? 0;
}

/**
 * Decide whether a stored narrative should be (re)generated on view.
 * AI is NEVER called for "ok"/"empty"; "failed" retries until the attempt cap.
 */
export function narrativeNeedsGeneration(stored: unknown): boolean {
  if (stored == null) return true; // never attempted
  if (typeof stored !== "object" || Array.isArray(stored)) return true;

  const meta = readMeta(stored);
  if (meta) {
    if (meta.status === "ok" || meta.status === "empty") return false;
    return meta.attempts < MAX_NARRATIVE_ATTEMPTS; // failed → bounded retry
  }

  // Legacy rows (no meta) were written before the marker — and possibly before the
  // executive/weekly sections existed. Regenerate ONCE if:
  //   - empty `{}`                       → the stuck-failure bug, or
  //   - has content but is missing BOTH  → an older top-insights-only narrative.
  //     `__executive__` and `__weekly__`
  // After regeneration a `__meta__` marker is written, so this never loops.
  const obj = stored as Record<string, unknown>;
  const contentKeys = Object.keys(obj).filter((k) => k !== META_KEY);
  if (contentKeys.length === 0) return true;
  const hasExecutive = obj["__executive__"] != null;
  const hasWeekly = obj["__weekly__"] != null;
  return !hasExecutive && !hasWeekly;
}
