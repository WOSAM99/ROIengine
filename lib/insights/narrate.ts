/**
 * Top Insights AI narration — fires at two triggers only:
 *   1. Upload import (per-upload narrative + all-aggregate narrative, in parallel)
 *   2. Upload delete (all-aggregate narrative re-run)
 *
 * User directive (2026-04-21): "do reload of data only when there new files uploaded."
 * → No regeneration endpoint. No dashboard-view-triggered calls. If a call fails, the
 *   narrative stays null for that scope (UI gracefully falls back to rule-based text).
 *
 * PRIVACY CONTRACT (user directive 2026-04-21 — "make sure to use summary data, do not
 * send full raw data to ai in any case"):
 *   - This function only accepts pre-aggregated `Metrics` + rule-computed `Insight[]`.
 *   - Never accepts raw `MetricJob[]` or any row-level data structure.
 *   - Never receives `jobId`, `clientName`, per-row `invoiceAmount` / `jobCost`, or raw dates.
 *   - Every field in the outgoing user message is an aggregate (SUM, AVG, COUNT, or GROUP BY
 *     output produced server-side by `lib/metrics/engine.ts`).
 *
 * Approval: AI_DOCS/memory/ai-cost-approvals.md → "Top Insights AI Narrative".
 * Rules: .claude/rules/ai-safety-rules.md Rules 3, 6, 7.
 */

import {
  getAnthropicClient,
  isAnthropicConfigured,
  extractUsage,
  logAiCall,
  DEFAULT_INSIGHTS_MODEL,
} from "@/lib/anthropic";
import { logger } from "@/lib/logger";
import type { Insight, InsightNarrative, Metrics } from "@/lib/metrics/types";

// Model comes from the ANTHROPIC_MODEL_INSIGHTS env var. Falls back to
// claude-haiku-4-5-20251001 if unset (cheap + fast for structured JSON narration).
const MODEL = DEFAULT_INSIGHTS_MODEL;
// Raised from 1200 → 1800 (2026-04-21): now 4–5 recommendations per insight
// (was 1–2), so each narrative object is ~2–3× larger. 1800 gives ~360 tokens
// per insight at 5 insights — comfortable margin over real output (~200 tokens
// per insight with tightened word caps).
const MAX_TOKENS = 1800;

const SYSTEM_PROMPT = `You are a CFO-grade financial analyst writing for owners of service businesses (restoration, construction, cleaning). Input:
- A company-level aggregated metrics snapshot (revenue, margin, cash collection).
- Up to 5 rule-computed "insights", each with a "severity" tag (critical | high | medium).

For EACH insight, produce THREE fields — keep every field TIGHT:
1. "explanation" — ONE sentence, ≤ 20 words. State what the number means for the business. Name the specific dimension (job type, PM name, or AR bucket). Do NOT restate numbers already in the insight's "detail" field.
2. "rootCause" — ONE sentence, ≤ 15 words. Name the SINGLE most likely operational cause. Be specific — not "Cost overruns" but "Underbid water mitigation jobs" or "Scope creep on commercial cleaning". Specific, not generic.
3. "recommendations" — array of EXACTLY 4 actions. Each action ≤ 15 words, starts with a verb, executable this week. Each action MUST name a specific target: job type, PM name, $ threshold, or aging bucket (e.g. "Pull last 6 water jobs and compare quoted vs actual labor hours", "Call every invoice in the 31-60 bucket by Friday"). Mix short-horizon tactical moves with one medium-horizon process fix. Order from highest-leverage to lowest.

Severity drives the explanation's closing sentence:
- critical → "This is costing you $X per [week/month] you delay." (use the insight's estimatedImpact)
- high → "Fixing this recovers $X." (use the insight's estimatedImpact)
- medium → "This is worth monitoring — $X at stake." (use the insight's estimatedImpact)

STRICT RULES:
- Output MUST be valid JSON, no markdown, no code fences, no trailing commentary.
- Do NOT invent numbers — use only what appears in the input.
- Use $ for all dollar amounts. No "consider", no "analyse", no "look into".
- If input text uses £, keep £.

Output STRICTLY this JSON shape:
{"narratives":[{"id":"<insight.id>","explanation":"...","rootCause":"...","recommendations":["...","..."]}]}`;

export type NarrateInput = {
  insights: Insight[];
  metrics: Pick<Metrics, "profitPulse" | "jobHealth" | "cashFlow" | "pmPerformance">;
};

/** Map of insight.id → narrative. Empty object when skipped / failed. */
export type NarrativeMap = Record<string, InsightNarrative>;

/**
 * Generate narratives for the given insights. Fail-silent: on any error path
 * (missing key, API error, malformed JSON), returns an empty map and logs.
 * Caller persists whatever map comes back — empty or populated — once.
 */
const FEATURE = "top-insights-narrate";

export async function narrateInsights(input: NarrateInput): Promise<NarrativeMap> {
  if (input.insights.length === 0) {
    logger.info(`${FEATURE} skipped: no insights to narrate`);
    return {};
  }

  if (!isAnthropicConfigured()) {
    logAiCall(FEATURE, "skipped");
    return {};
  }

  const client = getAnthropicClient();
  const userMessage = buildUserMessage(input);

  const started = Date.now();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const latencyMs = Date.now() - started;
    const usage = extractUsage(response.usage);
    const text = extractText(response.content);

    // Required by ai-safety-rules.md Rule 6 (token counts). Route + status only — no content.
    logAiCall(FEATURE, text ? "ok" : "empty", { model: response.model, latencyMs, usage });

    if (!text) return {};

    return parseNarratives(text, input.insights);
  } catch (error) {
    logAiCall(FEATURE, "error", {
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
    return {};
  }
}

const TOP_N = 5;

function buildUserMessage({ insights, metrics }: NarrateInput): string {
  // Every field below is an aggregate. Per the privacy contract at the top of this file,
  // no row-level data is included.
  const compactInsights = insights.map((i) => ({
    id: i.id,
    dimension: i.dimension,
    severity: i.severity,
    title: i.title,
    rule: i.rule,
    detail: i.detail,
    estimatedImpact: i.estimatedImpact,
  }));

  // Multi-query-derived aggregates (user directive 2026-04-21):
  //   "you can have multiple queries to get results and use that to send to ai".
  // All of these are already computed server-side by metrics/engine.ts.
  const topJobTypes = [...metrics.jobHealth.rows]
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, TOP_N)
    .map((r) => ({
      projectType: r.projectType,
      jobCount: r.jobCount,
      revenue: r.revenue,
      marginPct: r.marginPct,
      belowTargetCount: r.belowTargetCount,
      avgCycleDays: r.avgCycleDays,
    }));

  const topPms = [...metrics.pmPerformance.rows]
    .sort((a, b) => Number(b.revenue) - Number(a.revenue))
    .slice(0, TOP_N)
    .map((r) => ({
      pm: r.pm,
      jobCount: r.jobCount,
      revenue: r.revenue,
      marginPct: r.marginPct,
      variancePct: r.variancePct,
    }));

  const arByBucket = metrics.cashFlow.buckets.map((b) => ({
    bucket: b.bucket,
    count: b.count,
    amount: b.amount,
  }));

  const context = {
    company: {
      totalRevenue: metrics.profitPulse.totalRevenue,
      totalCost: metrics.profitPulse.totalCost,
      grossProfit: metrics.profitPulse.grossProfit,
      grossMarginPct: metrics.profitPulse.grossMarginPct,
      totalJobs: metrics.profitPulse.totalJobs,
      revenuePerJob: metrics.profitPulse.revenuePerJob,
      targetMarginPct: metrics.jobHealth.targetMarginPct,
      avgMarginPct: metrics.jobHealth.avgMarginPct,
      lowMarginJobCount: metrics.jobHealth.lowMarginJobCount,
      companyAvgPmMarginPct: metrics.pmPerformance.companyAvgMarginPct,
      cashCollected: metrics.cashFlow.cashCollected,
      totalBilled: metrics.cashFlow.totalBilled,
      outstanding: metrics.cashFlow.outstanding,
      collectionGap: metrics.cashFlow.collectionGap,
      collectionEfficiencyPct: metrics.cashFlow.collectionEfficiencyPct,
      arOver30: metrics.cashFlow.arOver30,
      arRiskPct: metrics.cashFlow.arRiskPct,
    },
    jobTypeAggregates: topJobTypes,
    pmAggregates: topPms,
    arBucketAggregates: arByBucket,
    insights: compactInsights,
  };

  return `Aggregated snapshot + rule-computed insights (NO raw job rows — aggregates only):\n\n${JSON.stringify(context, null, 2)}\n\nReturn the JSON object described in the system prompt. ${compactInsights.length} narrative object(s) expected — one per insight id.`;
}

type AnthropicContentBlock = { type: string; text?: string };

function extractText(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  const blocks = content as AnthropicContentBlock[];
  const chunks = blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text ?? "");
  const joined = chunks.join("").trim();
  return joined.length > 0 ? joined : null;
}

function parseNarratives(rawText: string, insights: Insight[]): NarrativeMap {
  const jsonText = stripFences(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    logger.warn("Top Insights narrate: invalid JSON from model", {
      error: error instanceof Error ? error.message : String(error),
      preview: jsonText.slice(0, 200),
    });
    return {};
  }

  if (!parsed || typeof parsed !== "object") return {};
  const obj = parsed as { narratives?: unknown };
  if (!Array.isArray(obj.narratives)) return {};

  const validIds = new Set(insights.map((i) => i.id));
  const map: NarrativeMap = {};

  for (const entry of obj.narratives) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as {
      id?: unknown;
      explanation?: unknown;
      rootCause?: unknown;
      recommendations?: unknown;
    };
    if (typeof e.id !== "string" || !validIds.has(e.id)) continue;
    if (typeof e.explanation !== "string" || e.explanation.length === 0) continue;
    if (typeof e.rootCause !== "string" || e.rootCause.length === 0) continue;
    if (!Array.isArray(e.recommendations)) continue;

    const recs = e.recommendations
      .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
      .slice(0, 5);
    if (recs.length === 0) continue;

    map[e.id] = {
      explanation: e.explanation.trim(),
      rootCause: e.rootCause.trim(),
      recommendations: recs,
    };
  }

  return map;
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const firstNewline = trimmed.indexOf("\n");
    if (firstNewline !== -1) {
      const withoutHead = trimmed.slice(firstNewline + 1);
      const endFence = withoutHead.lastIndexOf("```");
      return endFence === -1 ? withoutHead : withoutHead.slice(0, endFence).trim();
    }
  }
  return trimmed;
}
