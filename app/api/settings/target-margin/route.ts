import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * POST /api/settings/target-margin
 * Updates the company-wide default target margin used by future uploads.
 *
 * Body: { targetMargin: number }    // fraction 0..1 (e.g. 0.3 for 30%)
 * Response: { ok: true, defaultTargetMargin: number }
 *
 * Per-upload `Upload.targetMargin` still overrides this at import time.
 */

const BodySchema = z.object({
  targetMargin: z.number().min(0).max(1),
});

export async function POST(request: NextRequest) {
  const ctx = await requireCompany();

  let body;
  try {
    body = BodySchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid target margin",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  try {
    await db.company.update({
      where: { id: ctx.companyId },
      // Column added in migration 20260422140000. Cast until the generated
      // Prisma client catches up (user runs `pnpm db:generate` after migrate).
      data: {
        ...({
          defaultTargetMargin: new Prisma.Decimal(body.targetMargin),
        } as unknown as Prisma.CompanyUpdateInput),
      },
    });
  } catch (error) {
    logger.error("Failed to update company default target margin", {
      companyId: ctx.companyId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to update target margin" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, defaultTargetMargin: body.targetMargin });
}
