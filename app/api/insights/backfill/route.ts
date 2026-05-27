/**
 * POST /api/insights/backfill
 *
 * Client-triggered AI narrative backfill for a scope. Lets the dashboard /
 * upload-detail pages render instantly (rule-based fallback) and fill the AI
 * narrative in afterwards, instead of blocking the server render on slow AI calls.
 *
 * Body: { scope: "all" | "<uploadId>" }
 * Returns: { refreshed: boolean } — true only when NEW content was generated,
 *          which is the client's signal to router.refresh().
 *
 * Cost-safe: ensureScopeNarrative never re-calls "ok"/"empty" scopes and caps
 * retries on "failed" scopes. The scope is ownership-checked against the caller's
 * company, so a bogus / cross-tenant uploadId resolves to no-op.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireCompany } from "@/lib/auth";
import { ALL_UPLOADS } from "@/lib/metrics/engine";
import { ensureScopeNarrative } from "@/lib/insights/ensure-narrative";

const BodySchema = z.object({ scope: z.string().min(1) });

export async function POST(request: NextRequest) {
  const ctx = await requireCompany();

  let body: { scope: string };
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const uploadId = body.scope === ALL_UPLOADS ? ALL_UPLOADS : body.scope;
  const { refreshed } = await ensureScopeNarrative({ companyId: ctx.companyId, uploadId });

  return NextResponse.json({ refreshed });
}
