import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { QUESTIONS, QUESTION_KEYS, type QuestionKey } from "@/lib/chat/questions";
import { computeOverview, computeStats } from "@/lib/chat/stats";
import { summarize, summarizeFreeform } from "@/lib/chat/summarize";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const CannedBody = z.object({
  questionKey: z.enum(QUESTION_KEYS),
  uploadId: z.string().optional(),
});

const FreeformBody = z.object({
  question: z.string().trim().min(1).max(500),
  uploadId: z.string().optional(),
});

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;

export async function POST(request: NextRequest) {
  const ctx = await requireCompany();

  const ip = clientIpFrom(request.headers);
  const limit = rateLimit(`chat:${ctx.profileId}:${ip}`, {
    windowMs: WINDOW_MS,
    max: MAX_PER_WINDOW,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many questions. Try again in a moment." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const canned = CannedBody.safeParse(raw);
  if (canned.success) {
    return handleCanned(ctx, canned.data.questionKey, canned.data.uploadId);
  }
  const freeform = FreeformBody.safeParse(raw);
  if (freeform.success) {
    return handleFreeform(ctx, freeform.data.question, freeform.data.uploadId);
  }

  return NextResponse.json(
    { error: "Provide either `questionKey` or `question`." },
    { status: 400 },
  );
}

async function handleCanned(
  ctx: { companyId: string; profileId: string },
  questionKey: QuestionKey,
  uploadId: string | undefined,
) {
  logger.info("/api/chat → canned", {
    questionKey,
    question: QUESTIONS[questionKey].label,
    companyId: ctx.companyId,
  });

  const statsOutcome = await computeStats(questionKey, { companyId: ctx.companyId, uploadId });
  if (!statsOutcome) {
    return NextResponse.json(
      { error: "No ready uploads to answer this question." },
      { status: 404 },
    );
  }

  logger.info("/api/chat → canned stats computed", {
    questionKey,
    uploadId: statsOutcome.uploadId,
    sql: statsOutcome.sqlRan,
    stats: statsOutcome.result,
  });

  const summary = await summarize({ questionKey, payload: statsOutcome.result });
  await persistMessage({
    companyId: ctx.companyId,
    profileId: ctx.profileId,
    uploadId: statsOutcome.uploadId,
    question: QUESTIONS[questionKey].label,
    questionKey,
    sqlRan: statsOutcome.sqlRan,
    rows: statsOutcome.result as unknown as object,
    summary,
  });

  return NextResponse.json({
    mode: "canned" as const,
    questionKey,
    question: QUESTIONS[questionKey].label,
    narrativeAvailable: summary.available,
    narrative: summary.narrative,
    failureReason: summary.failureReason,
    stats: statsOutcome.result,
    uploadId: statsOutcome.uploadId,
  });
}

async function handleFreeform(
  ctx: { companyId: string; profileId: string },
  question: string,
  uploadId: string | undefined,
) {
  logger.info("/api/chat → freeform", { question, companyId: ctx.companyId });

  const overview = await computeOverview({ companyId: ctx.companyId, uploadId });
  if (!overview) {
    return NextResponse.json(
      { error: "No ready uploads to answer this question." },
      { status: 404 },
    );
  }

  logger.info("/api/chat → freeform overview computed", {
    uploadId: overview.uploadId,
    sql: overview.sqlRan,
    profitPulse: overview.result.profitPulse,
  });

  const summary = await summarizeFreeform({ question, payload: overview.result });
  await persistMessage({
    companyId: ctx.companyId,
    profileId: ctx.profileId,
    uploadId: overview.uploadId,
    question,
    questionKey: "FREEFORM",
    sqlRan: overview.sqlRan,
    rows: overview.result as unknown as object,
    summary,
  });

  return NextResponse.json({
    mode: "freeform" as const,
    question,
    narrativeAvailable: summary.available,
    narrative: summary.narrative,
    failureReason: summary.failureReason,
    stats: overview.result,
    uploadId: overview.uploadId,
  });
}

async function persistMessage(args: {
  companyId: string;
  profileId: string;
  uploadId: string;
  question: string;
  questionKey: string;
  sqlRan: string;
  rows: object;
  summary: Awaited<ReturnType<typeof summarize>>;
}) {
  try {
    const record = await db.chatMessage.create({
      data: {
        companyId: args.companyId,
        profileId: args.profileId,
        uploadId: args.uploadId,
        question: args.question,
        questionKey: args.questionKey,
        sqlRan: args.sqlRan,
        rows: args.rows as object,
        summary: args.summary.narrative ?? "",
        model: args.summary.model,
        inputTokens: args.summary.usage.inputTokens,
        outputTokens: args.summary.usage.outputTokens,
        cacheReadTokens: args.summary.usage.cacheReadTokens,
        cacheCreationTokens: args.summary.usage.cacheCreationTokens,
      },
      select: { id: true },
    });
    logger.info("/api/chat ← persisted ChatMessage", {
      chatMessageId: record.id,
      questionKey: args.questionKey,
      narrativeAvailable: args.summary.available,
      failureReason: args.summary.failureReason,
      latency_ms: args.summary.latencyMs,
      tokens_in: args.summary.usage.inputTokens,
      tokens_out: args.summary.usage.outputTokens,
      tokens_cache_read: args.summary.usage.cacheReadTokens,
    });
  } catch (error) {
    logger.error("/api/chat failed to persist ChatMessage", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
