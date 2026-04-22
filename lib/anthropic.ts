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

/**
 * Emits a single log line summarising every Anthropic API call's token usage.
 * Required by `.claude/rules/ai-safety-rules.md` Rule 6 ("Every LLM call MUST
 * log input and output token counts").
 *
 * Output appears in the Next.js SERVER console (the terminal running `pnpm dev`),
 * NOT in the browser devtools — these calls happen server-side.
 */
export function logUsage(feature: string, usage: AnthropicUsage, model: string) {
  const totalBillable = usage.inputTokens + usage.outputTokens;
  logger.info(`[LLM USAGE] ${feature}`, {
    feature,
    model,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    cache_read_input_tokens: usage.cacheReadTokens,
    cache_creation_input_tokens: usage.cacheCreationTokens,
    total_billable_tokens: totalBillable,
  });
}
