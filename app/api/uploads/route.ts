import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { detectFormat, readFileBuffer } from "@/lib/parse/read";
import { normalize } from "@/lib/parse/normalize";
import { validateFile, validateMapping } from "@/lib/parse/validate";
import { CANONICAL_FIELDS, type ColumnMapping, type NormalizedJob } from "@/lib/parse/types";
import { logger } from "@/lib/logger";
import { buildUploadNarrative } from "@/lib/insights/build-upload-narrative";
import { refreshAllUploadsNarrative } from "@/lib/insights/aggregate-narrative";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const INSERT_BATCH = 500;

const MappingSchema = z.record(z.enum(CANONICAL_FIELDS), z.string().min(1));

const MetaSchema = z.object({
  mapping: MappingSchema,
  targetMargin: z.number().min(0).max(1).default(0.3),
});

export async function POST(request: NextRequest) {
  const ctx = await requireCompany();

  const formData = await request.formData();
  const file = formData.get("file");
  const metaRaw = formData.get("meta");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `File is too large (${file.size} bytes). Max is ${MAX_UPLOAD_BYTES}.` },
      { status: 413 },
    );
  }
  if (typeof metaRaw !== "string") {
    return NextResponse.json({ error: "Missing mapping metadata" }, { status: 400 });
  }

  let meta;
  try {
    meta = MetaSchema.parse(JSON.parse(metaRaw));
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid mapping payload",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 },
    );
  }

  const mapping: ColumnMapping = meta.mapping;
  const mappingIssues = validateMapping(mapping);
  if (mappingIssues.length > 0) {
    return NextResponse.json(
      { error: "Mapping incomplete", issues: mappingIssues },
      { status: 422 },
    );
  }

  const format = detectFormat(file.name, file.type);
  if (!format) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });
  }

  const buffer = await file.arrayBuffer();
  const parsed = await readFileBuffer(buffer, format);
  const fileIssues = validateFile(parsed);
  if (fileIssues.length > 0) {
    return NextResponse.json({ error: fileIssues[0].message }, { status: 422 });
  }

  const outcome = normalize({ parsed, mapping });

  const upload = await db.upload.create({
    data: {
      companyId: ctx.companyId,
      uploadedBy: ctx.profileId,
      filename: file.name,
      storagePath: "",
      rowCount: outcome.jobs.length,
      skippedRows: outcome.skippedCount,
      status: "PROCESSING",
      targetMargin: new Prisma.Decimal(meta.targetMargin),
      warnings: outcome.warnings,
    },
  });

  try {
    for (let offset = 0; offset < outcome.jobs.length; offset += INSERT_BATCH) {
      const batch = outcome.jobs
        .slice(offset, offset + INSERT_BATCH)
        .map((job) => toJobCreate(job, ctx.companyId, upload.id));
      await db.job.createMany({ data: batch });
    }

    // Flip the upload to READY first so computeMetrics({ uploadId: "all" }) sees it.
    await db.upload.update({
      where: { id: upload.id },
      data: { status: "READY" },
    });

    // Two AI narrations in parallel (per-upload + all-aggregate).
    // User directive (2026-04-21): "reload of data only when there new files uploaded".
    // Both fail-silent — upload still succeeds if either narrate call errors.
    const [perUploadNarrative] = await Promise.all([
      buildUploadNarrative(ctx.companyId, upload.id),
      refreshAllUploadsNarrative(ctx.companyId),
    ]);

    if (perUploadNarrative !== null) {
      await db.upload.update({
        where: { id: upload.id },
        data: {
          // Field added in migration 20260421120000. Cast until generated types catch up.
          ...({
            insightsNarrative: perUploadNarrative as Prisma.InputJsonValue,
          } as Prisma.UploadUpdateInput),
        },
      });
    }

    return NextResponse.json({
      uploadId: upload.id,
      imported: outcome.jobs.length,
      skipped: outcome.skippedCount,
      warnings: outcome.warnings,
    });
  } catch (error) {
    logger.error("Failed to insert jobs", {
      uploadId: upload.id,
      message: error instanceof Error ? error.message : String(error),
    });
    await db.upload.update({
      where: { id: upload.id },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });
    return NextResponse.json({ error: "Failed to persist upload" }, { status: 500 });
  }
}

function toJobCreate(
  job: NormalizedJob,
  companyId: string,
  uploadId: string,
): Prisma.JobCreateManyInput {
  return {
    companyId,
    uploadId,
    jobId: job.jobId,
    clientName: job.clientName,
    projectType: job.projectType,
    status: job.status,
    projectManager: job.projectManager,
    invoiceAmount: new Prisma.Decimal(job.invoiceAmount),
    jobCost: new Prisma.Decimal(job.jobCost),
    cashReceived: new Prisma.Decimal(job.cashReceived),
    balanceDue: new Prisma.Decimal(job.balanceDue),
    laborHours: job.laborHours ? new Prisma.Decimal(job.laborHours) : null,
    arBucket: job.arBucket,
    startDate: job.startDate ? new Date(`${job.startDate}T00:00:00Z`) : null,
    finishDate: job.finishDate ? new Date(`${job.finishDate}T00:00:00Z`) : null,
    raw: job.raw as Prisma.InputJsonValue,
  };
}
