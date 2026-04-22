import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { refreshAllUploadsNarrative } from "@/lib/insights/aggregate-narrative";

type RouteContext = { params: Promise<{ uploadId: string }> };

/**
 * DELETE an upload and all its rows.
 *
 * Cascades via Prisma schema:
 *   - Job → CASCADE (jobs for this upload are removed)
 *   - ChatMessage.uploadId → SET NULL (chat history preserved, upload ref cleared)
 *
 * After delete, recomputes the "All uploads" aggregate narrative because the
 * aggregate data has structurally changed. If no uploads remain, the aggregate
 * narrative is set to null.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const ctx = await requireCompany();
  const { uploadId } = await context.params;

  if (!uploadId || typeof uploadId !== "string") {
    return NextResponse.json({ error: "Invalid upload id" }, { status: 400 });
  }

  const upload = await db.upload.findFirst({
    where: { id: uploadId, companyId: ctx.companyId },
    select: { id: true, filename: true },
  });
  if (!upload) {
    return NextResponse.json({ error: "Upload not found" }, { status: 404 });
  }

  try {
    await db.upload.delete({ where: { id: upload.id } });
  } catch (error) {
    logger.error("Failed to delete upload", {
      uploadId: upload.id,
      error: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete upload" }, { status: 500 });
  }

  // Data shape changed — regenerate aggregate narrative. Fail-silent inside the helper.
  await refreshAllUploadsNarrative(ctx.companyId);

  return NextResponse.json({
    deletedUploadId: upload.id,
    filename: upload.filename,
  });
}
