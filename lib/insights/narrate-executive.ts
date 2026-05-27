/**
 * Executive Priority AI narration — fires at upload import time only.
 *
 * Generates the "What to do", "Why it matters", and "How to execute" sections
 * for the Executive Priority Header Card ("Start Here").
 *
 * PRIVACY CONTRACT: Only pre-aggregated Metrics + deterministic constraint data
 * cross the AI boundary. Never raw job rows, client names, or per-row financials.
 *
 * Approval: AI_DOCS/memory/ai-cost-approvals.md → "Executive Priority + Weekly Priority Narratives"
 */

import {
  DEFAULT_INSIGHTS_MODEL,
  extractUsage,
  getAnthropicClient,
  isAnthropicConfigured,
  logUsage,
} from "@/lib/anthropic";
import { logger } from "@/lib/logger";
import type { ConstraintType, ExecutivePriorityKpi, Metrics } from "@/lib/metrics/types";

const MODEL = DEFAULT_INSIGHTS_MODEL;
const MAX_TOKENS = 600;
const FEATURE = "executive-priority-narrate";

const SYSTEM_PROMPT = `You are a CFO-grade financial analyst for service businesses (restoration, construction, cleaning).
You receive the PRIMARY CONSTRAINT — the single most important financial or operational issue the business owner must address now.

Return EXACTLY this JSON (no markdown, no code fences):
{
  "directive": "One sentence. Active verb. What to do. Specific and actionable. ≤20 words.",
  "whyItMatters": "1-2 sentences. Specific $ impact. Financial/operational consequence. ≤35 words.",
  "howToExecute": ["Step 1: ...", "Step 2: ...", "Step 3: ...", "Step 4: ..."]
}

howToExecute rules:
- Exactly 4 steps. Each starts with "Step N:" prefix. Each ≤20 words.
- Each step is executable THIS WEEK. Ordered from most immediate to most strategic.
- No platitudes, no "consider", no "you should". Use $ not £ unless input uses £.`;

export type ExecutiveNarrativeResult = {
  directive: string;
  whyItMatters: string;
  howToExecute: string[];
};

export async function narrateExecutive(input: {
  primary: {
    constraintType: ConstraintType;
    title: string;
    kpis: ExecutivePriorityKpi[];
    score: number;
  };
  metrics: Pick<Metrics, "profitPulse" | "jobHealth" | "cashFlow" | "pmPerformance">;
}): Promise<ExecutiveNarrativeResult | null> {
  if (!isAnthropicConfigured()) {
    logger.warn(`${FEATURE} skipped — ANTHROPIC_API_KEY not set`);
    return null;
  }

  const client = getAnthropicClient();
  const userMessage = buildUserMessage(input);

  logger.info(`${FEATURE} → calling Anthropic`, {
    feature: FEATURE,
    model: MODEL,
    max_tokens: MAX_TOKENS,
    constraint_type: input.primary.constraintType,
  });

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
    logUsage(FEATURE, usage, response.model);

    const text = extractText(response.content);
    logger.info(`${FEATURE} ← response`, {
      feature: FEATURE,
      latency_ms: latencyMs,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
    });

    if (!text) {
      logger.warn(`${FEATURE}: empty content`);
      return null;
    }

    return parseResult(text);
  } catch (error) {
    logger.error(`${FEATURE} failed`, {
      feature: FEATURE,
      latency_ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function buildUserMessage(input: {
  primary: {
    constraintType: ConstraintType;
    title: string;
    kpis: ExecutivePriorityKpi[];
    score: number;
  };
  metrics: Pick<Metrics, "profitPulse" | "jobHealth" | "cashFlow" | "pmPerformance">;
}): string {
  const context = {
    primaryConstraint: {
      type: input.primary.constraintType,
      title: input.primary.title,
      kpis: input.primary.kpis.map((k) => `${k.label}: ${k.value}`),
    },
    company: {
      totalRevenue: input.metrics.profitPulse.totalRevenue,
      grossMarginPct: input.metrics.profitPulse.grossMarginPct,
      targetMarginPct: input.metrics.jobHealth.targetMarginPct,
      collectionEfficiencyPct: input.metrics.cashFlow.collectionEfficiencyPct,
      arOver30: input.metrics.cashFlow.arOver30,
      arRiskPct: input.metrics.cashFlow.arRiskPct,
    },
  };

  return `Primary constraint and company snapshot (aggregated data only):\n\n${JSON.stringify(context, null, 2)}\n\nReturn the JSON described in the system prompt.`;
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

function parseResult(rawText: string): ExecutiveNarrativeResult | null {
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
  const obj = parsed as {
    directive?: unknown;
    whyItMatters?: unknown;
    howToExecute?: unknown;
  };

  if (typeof obj.directive !== "string" || obj.directive.length === 0) return null;
  if (typeof obj.whyItMatters !== "string" || obj.whyItMatters.length === 0) return null;
  if (!Array.isArray(obj.howToExecute)) return null;

  const steps = obj.howToExecute.filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0,
  );
  if (steps.length === 0) return null;

  return {
    directive: obj.directive.trim(),
    whyItMatters: obj.whyItMatters.trim(),
    howToExecute: steps,
  };
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
