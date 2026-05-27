/**
 * Action Validation (Feature 3F / decision D4).
 *
 * Re-checks the weekly priorities that were recommended in the PREVIOUS period
 * against the CURRENT period's numbers, and reports whether each targeted area
 * actually improved — e.g. "Cash collection efficiency improved from 56% to 68%
 * after last week's focus."
 *
 * No new storage is needed: each upload already persists the weekly priorities it
 * recommended in `Upload.insightsNarrative.__weekly__` at import time. We read the
 * previous period's representative upload and compare metrics period-over-period.
 */

import { db } from "@/lib/db";
import { formatPct } from "@/lib/format";
import type { ConstraintType, Metrics } from "@/lib/metrics/types";

export type ActionOutcome = "improved" | "declined" | "flat";

export type ActionValidation = {
  /** Stable key so React lists don't rely on index. */
  key: string;
  /** Human label of the area that was targeted, e.g. "Cash collection efficiency". */
  area: string;
  outcome: ActionOutcome;
  /** Full sentence describing what happened. */
  message: string;
  /** The priority title the system recommended last period (for context). */
  priorTitle: string | null;
};

/** Maps each constraint type to the single metric a successful action should move. */
type MetricDescriptor = {
  /** Dedupe key — multiple constraint types can target the same metric. */
  key: string;
  area: string;
  get: (m: Metrics) => number;
  format: (v: number) => string;
  /** True when a higher value is better (margin, collection %); false when lower is better. */
  higherBetter: boolean;
  /** Change smaller than this (in the metric's own units) counts as "flat". */
  epsilon: number;
};

const COLLECTION: MetricDescriptor = {
  key: "collection",
  area: "Cash collection efficiency",
  get: (m) => m.cashFlow.collectionEfficiencyPct,
  format: (v) => formatPct(v),
  higherBetter: true,
  epsilon: 0.5,
};

const MARGIN: MetricDescriptor = {
  key: "margin",
  area: "Gross margin",
  get: (m) => m.jobHealth.avgMarginPct,
  format: (v) => formatPct(v),
  higherBetter: true,
  epsilon: 0.3,
};

const CONSTRAINT_METRIC: Record<ConstraintType, MetricDescriptor> = {
  ar_aging: COLLECTION,
  cash_efficiency: COLLECTION,
  gross_margin: MARGIN,
  negative_job_type: MARGIN,
  pm_variance: MARGIN,
};

const VALID_CONSTRAINTS: ConstraintType[] = [
  "ar_aging",
  "gross_margin",
  "negative_job_type",
  "cash_efficiency",
  "pm_variance",
];

/**
 * Validate the previous period's recommendations against the current period.
 * Returns one entry per distinct targeted metric (deduped, highest-ranked priority wins).
 * Empty array when the previous period stored no priorities.
 */
export async function computeActionValidations(input: {
  previousUploadId: string;
  previousMetrics: Metrics;
  currentMetrics: Metrics;
}): Promise<ActionValidation[]> {
  const priorities = await loadPriorPriorities(input.previousUploadId);
  if (priorities.length === 0) return [];

  const seen = new Set<string>();
  const validations: ActionValidation[] = [];

  for (const prior of priorities) {
    const descriptor = CONSTRAINT_METRIC[prior.constraintType];
    if (seen.has(descriptor.key)) continue;
    seen.add(descriptor.key);

    const prev = descriptor.get(input.previousMetrics);
    const curr = descriptor.get(input.currentMetrics);
    const outcome = classify(prev, curr, descriptor);

    validations.push({
      key: descriptor.key,
      area: descriptor.area,
      outcome,
      message: buildMessage(descriptor, prev, curr, outcome),
      priorTitle: prior.title,
    });
  }

  return validations;
}

function classify(prev: number, curr: number, d: MetricDescriptor): ActionOutcome {
  const delta = curr - prev;
  if (Math.abs(delta) < d.epsilon) return "flat";
  const movedUp = delta > 0;
  const isBetter = d.higherBetter ? movedUp : !movedUp;
  return isBetter ? "improved" : "declined";
}

function buildMessage(
  d: MetricDescriptor,
  prev: number,
  curr: number,
  outcome: ActionOutcome,
): string {
  const from = d.format(prev);
  const to = d.format(curr);
  switch (outcome) {
    case "improved":
      return `${d.area} improved from ${from} to ${to} after last week's focus.`;
    case "declined":
      return `${d.area} slipped from ${from} to ${to} despite last week's focus — keep pushing.`;
    case "flat":
      return `${d.area} held steady at ${to} — last week's action has not moved the needle yet.`;
  }
}

type PriorPriority = {
  constraintType: ConstraintType;
  /** Lower rank index = higher priority. */
  rank: number;
  title: string | null;
};

/**
 * Read the weekly priorities the previous upload recommended, from
 * `Upload.insightsNarrative.__weekly__` (a map of priorityId → AI fields).
 * priorityId format is `weekly:<constraintType>:<idx>`.
 */
async function loadPriorPriorities(uploadId: string): Promise<PriorPriority[]> {
  const row = (await db.upload.findUnique({
    where: { id: uploadId },
  })) as ({ insightsNarrative?: unknown } & { id: string }) | null;

  const narrative = row?.insightsNarrative;
  if (!narrative || typeof narrative !== "object") return [];

  const weekly = (narrative as Record<string, unknown>)["__weekly__"];
  if (!weekly || typeof weekly !== "object") return [];

  const out: PriorPriority[] = [];
  for (const [priorityId, value] of Object.entries(weekly as Record<string, unknown>)) {
    const constraintType = constraintTypeFromId(priorityId);
    if (!constraintType) continue;
    const rank = rankFromId(priorityId);
    const title =
      value && typeof value === "object" && typeof (value as { title?: unknown }).title === "string"
        ? (value as { title: string }).title
        : null;
    out.push({ constraintType, rank, title });
  }

  // Highest priority (lowest rank index) first, so dedupe keeps the most important.
  out.sort((a, b) => a.rank - b.rank);
  return out;
}

function constraintTypeFromId(id: string): ConstraintType | null {
  const type = id.split(":")[1];
  return VALID_CONSTRAINTS.includes(type as ConstraintType) ? (type as ConstraintType) : null;
}

function rankFromId(id: string): number {
  const idx = Number(id.split(":")[2]);
  return Number.isFinite(idx) ? idx : Number.MAX_SAFE_INTEGER;
}
