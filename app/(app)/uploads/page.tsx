import Link from "next/link";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { DeleteUploadButton } from "@/components/upload/delete-upload-button";

export const metadata = {
  title: "Uploads · ROI Dashboard",
};

export default async function UploadsPage() {
  const ctx = await requireCompany();

  const uploads = await db.upload.findMany({
    where: { companyId: ctx.companyId },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      filename: true,
      rowCount: true,
      skippedRows: true,
      status: true,
      uploadedAt: true,
    },
    take: 50,
  });

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Imports"
        title="Uploads"
        description="Every file you've imported. Click one to see per-upload metrics."
        action={
          <Button asChild variant="accent" size="lg">
            <Link href="/uploads/new">
              <Upload className="size-4" />
              New upload
            </Link>
          </Button>
        }
      />

      {uploads.length === 0 ? (
        <EmptyState
          variant="dashed"
          icon={Upload}
          title="No uploads yet"
          description="Upload a CSV or XLSX to get started — we'll handle the mapping."
          action={
            <Button asChild variant="accent">
              <Link href="/uploads/new">
                <Upload className="size-4" />
                Upload your first file
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {uploads.map((u) => (
            <li
              key={u.id}
              className="shadow-card hover:shadow-card-hover group bg-card focus-within:shadow-card-hover relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-black/5 p-5 transition-all duration-200 hover:-translate-y-0.5"
            >
              <span
                aria-hidden
                className={
                  u.status === "READY"
                    ? "bg-success-500 absolute inset-y-0 left-0 w-[3px]"
                    : u.status === "FAILED"
                      ? "bg-danger-500 absolute inset-y-0 left-0 w-[3px]"
                      : "bg-warning-500 absolute inset-y-0 left-0 w-[3px]"
                }
              />
              {/* Stretched-link: covers the card; delete button sits above via z-index. */}
              <Link
                href={`/uploads/${u.id}`}
                aria-label={`Open ${u.filename}`}
                className="focus-visible:ring-accent absolute inset-0 z-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              />
              <div className="pointer-events-none relative z-10 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="bg-accent-50 text-accent-700 flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <FileSpreadsheet className="size-4" />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="group-hover:text-accent-700 text-sm leading-tight font-semibold break-words">
                      {u.filename}
                    </p>
                    <p className="text-muted-foreground text-[11px] tracking-wider uppercase">
                      {new Date(u.uploadedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
                <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
                  <UploadStatusBadge status={u.status} />
                  <DeleteUploadButton uploadId={u.id} filename={u.filename} variant="icon" />
                </div>
              </div>
              <dl className="border-border/60 pointer-events-none relative z-10 mt-auto grid grid-cols-2 gap-3 border-t pt-4 text-xs">
                <div>
                  <dt className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Imported
                  </dt>
                  <dd className="font-numeric text-lg font-bold">{u.rowCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                    Skipped
                  </dt>
                  <dd
                    className={
                      u.skippedRows > 0
                        ? "font-numeric text-warning-700 text-lg font-bold"
                        : "font-numeric text-muted-foreground/60 text-lg font-bold"
                    }
                  >
                    {u.skippedRows}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UploadStatusBadge({ status }: { status: "PROCESSING" | "READY" | "FAILED" }) {
  const map = {
    READY: { variant: "success" as const, label: "Ready" },
    PROCESSING: { variant: "warning" as const, label: "Processing" },
    FAILED: { variant: "destructive" as const, label: "Failed" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
