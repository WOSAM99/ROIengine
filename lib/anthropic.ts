import Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;

let cached: Anthropic | null = null;

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.length > 0);
}

export function getAnthropicClient(): Anthropic {
  if (!isAnthropicConfigured()) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  if (!cached) {
    cached = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    });
  }
  return cached;
}

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

/** Model for Top Insights narration. Separate env var so insights stay cheap on Haiku
 *  while chat/summarize stays on Sonnet for better prose quality. */
export const DEFAULT_INSIGHTS_MODEL =
  process.env.ANTHROPIC_MODEL_INSIGHTS ?? "claude-haiku-4-5-20251001";

export type AnthropicUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
};

export function extractUsage(
  usage:
    | {
        input_tokens?: number;
        output_tokens?: number;
        cache_read_input_tokens?: number | null;
        cache_creation_input_tokens?: number | null;
      }
    | undefined,
): AnthropicUsage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
    cacheReadTokens: usage?.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage?.cache_creation_input_tokens ?? 0,
  };
}

export type AiCallStatus = "ok" | "empty" | "error" | "skipped";

/**
 * Single uniform log line for every Anthropic API call: the call's ROUTE (the
 * feature identifier) and its STATUS. Deliberately logs NO request/response
 * content — no payloads, prompts, questions, or generated text. Only the route,
 * status, model, latency, and token counts.
 *
 * - `ok`      — call returned usable content
 * - `empty`   — call succeeded but returned no usable content
 * - `error`   — call threw (network / API error)
 * - `skipped` — no ANTHROPIC_API_KEY, so no call was made
 *
 * Token counts satisfy `.claude/rules/ai-safety-rules.md` Rule 6 ("Every LLM
 * call MUST log input and output token counts").
 *
 * Output appears in the Next.js SERVER console (the terminal running `pnpm dev`),
 * NOT in the browser devtools — these calls happen server-side.
 */
export function logAiCall(
  route: string,
  status: AiCallStatus,
  meta?: { model?: string; latencyMs?: number; usage?: AnthropicUsage; error?: string },
): void {
  const fields: Record<string, unknown> = { route, status };
  if (meta?.model) fields.model = meta.model;
  if (meta?.latencyMs != null) fields.latency_ms = meta.latencyMs;
  if (meta?.usage) {
    fields.input_tokens = meta.usage.inputTokens;
    fields.output_tokens = meta.usage.outputTokens;
  }
  if (meta?.error) fields.error = meta.error;

  const message = `[AI] ${route} → ${status}`;
  if (status === "error") {
    logger.error(message, fields);
  } else {
    logger.info(message, fields);
  }
}
