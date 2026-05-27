/**
 * Weekly Priorities AI narration — fires at upload import time only.
 *
 * Generates titles, reasons, expected outcomes, and action steps for the
 * Weekly Priorities section on the dashboard.
 *
 * PRIVACY CONTRACT: Only pre-aggregated Metrics + deterministic constraint ranks
 * cross the AI boundary. Never raw job rows or per-row financials.
 *
 * Approval: AI_DOCS/memory/ai-cost-approvals.md → "Executive Priority + Weekly Priority Narratives"
 */

import {
  DEFAULT_INSIGHTS_MODEL,
  extractUsage,
  getAnthropicClient,
  isAnthropicConfigured,
  logAiCall,
} from "@/lib/anthropic";
import { logger } from "@/lib/logger";
import type { ConstraintType, Metrics, WeeklyPriorityStatus } from "@/lib/metrics/types";

const MODEL = DEFAULT_INSIGHTS_MODEL;
const MAX_TOKENS = 1200;
const FEATURE = "weekly-priorities-narrate";

const SYSTEM_PROMPT = `You are a CFO-grade financial analyst for service businesses (restoration, construction, cleaning).
You receive a ranked list of operational/financial constraints for the current week.

For EACH constraint return:
1. "title" — ≤10 words. Specific, not generic. Include $ amount or % if relevant.
2. "reason" — ONE sentence, ≤20 words. Why THIS WEEK specifically.
3. "expectedOutcome" — ONE sentence, ≤20 words. What improvement looks like in numbers.
4. "actions" — EXACTLY 2-3 steps. Each ≤15 words. Starts with a strong verb.

Return STRICTLY this JSON (no markdown, no code fences):
{"priorities":[{"id":"...","title":"...","reason":"...","expectedOutcome":"...","actions":["...","..."]}]}

One object per input constraint, in the same order. Use $ currency unless input uses £.`;

export type WeeklyPriorityAiFields = {
  title: string;
  reason: string;
  expectedOutcome: string;
  actions: string[];
};

export async function narrateWeeklyPriorities(input: {
  priorities: Array<{
    id: string;
    constraintType: ConstraintType;
    status: WeeklyPriorityStatus;
    estimatedImpact: string;
  }>;
  metrics: Pick<Metrics, "profitPulse" | "jobHealth" | "cashFlow" | "pmPerformance">;
}): Promise<Record<string, WeeklyPriorityAiFields> | null> {
  if (input.priorities.length === 0) return null;

  if (!isAnthropicConfigured()) {
    logAiCall(FEATURE, "skipped");
    return null;
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

    if (!text) return null;

    return parseResult(
      text,
      input.priorities.map((p) => p.id),
    );
  } catch (error) {
    logAiCall(FEATURE, "error", {
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function buildUserMessage(input: {
  priorities: Array<{
    id: string;
    constraintType: ConstraintType;
    status: WeeklyPriorityStatus;
    estimatedImpact: string;
  }>;
  metrics: Pick<Metrics, "profitPulse" | "jobHealth" | "cashFlow" | "pmPerformance">;
}): string {
  const context = {
    constraints: input.priorities.map((p) => ({
      id: p.id,
      type: p.constraintType,
      urgency: p.status,
      estimatedImpactDollars: p.estimatedImpact,
    })),
    company: {
      totalRevenue: input.metrics.profitPulse.totalRevenue,
      grossMarginPct: input.metrics.profitPulse.grossMarginPct,
      targetMarginPct: input.metrics.jobHealth.targetMarginPct,
      avgMarginPct: input.metrics.jobHealth.avgMarginPct,
      collectionEfficiencyPct: input.metrics.cashFlow.collectionEfficiencyPct,
      arOver30: input.metrics.cashFlow.arOver30,
      jobTypeBreakdown: input.metrics.jobHealth.rows.map((r) => ({
        type: r.projectType,
        marginPct: r.marginPct,
        revenue: r.revenue,
      })),
    },
  };

  return `Ranked constraints and company snapshot (aggregated data only):\n\n${JSON.stringify(context, null, 2)}\n\nReturn the JSON described in the system prompt. ${input.priorities.length} priority object(s) expected.`;
}

type ContentBlock = { type: string; text?: string };

function extractText(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  const blocks = content as ContentBlock[];
  const joined = blocks
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
  return joined.length > 0 ? joined : null;
}

function parseResult(
  rawText: string,
  validIds: string[],
): Record<string, WeeklyPriorityAiFields> | null {
  const jsonText = stripFences(rawText);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    logger.warn(`${FEATURE}: invalid JSON from model`, {
      error: error instanceof Error ? error.message : String(error),
      preview: jsonText.slice(0, 200),
    });
    return null;
  }

  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as { priorities?: unknown };
  if (!Array.isArray(obj.priorities)) return null;

  const idSet = new Set(validIds);
  const result: Record<string, WeeklyPriorityAiFields> = {};

  for (const entry of obj.priorities) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as {
      id?: unknown;
      title?: unknown;
      reason?: unknown;
      expectedOutcome?: unknown;
      actions?: unknown;
    };

    if (typeof e.id !== "string" || !idSet.has(e.id)) continue;
    if (typeof e.title !== "string" || e.title.length === 0) continue;
    if (typeof e.reason !== "string" || e.reason.length === 0) continue;
    if (typeof e.expectedOutcome !== "string" || e.expectedOutcome.length === 0) continue;
    if (!Array.isArray(e.actions)) continue;

    const actions = e.actions.filter(
      (a): a is string => typeof a === "string" && a.trim().length > 0,
    );
    if (actions.length === 0) continue;

    result[e.id] = {
      title: e.title.trim(),
      reason: e.reason.trim(),
      expectedOutcome: e.expectedOutcome.trim(),
      actions,
    };
  }

  return Object.keys(result).length > 0 ? result : null;
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
