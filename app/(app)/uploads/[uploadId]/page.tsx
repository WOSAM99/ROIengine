import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireCompany } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeMetrics } from "@/lib/metrics/engine";
import { scopeNeedsNarrative } from "@/lib/insights/ensure-narrative";
import { NarrativeBackfill } from "@/components/insights/narrative-backfill";
import { ProfitPulseWidget } from "@/components/widgets/profit-pulse";
import { JobHealthWidget } from "@/components/widgets/job-health";
import { CashFlowWidget } from "@/components/widgets/cash-flow";
import { TopInsightsWidget } from "@/components/widgets/top-insights";
import { DeleteUploadButton } from "@/components/upload/delete-upload-button";

export const metadata = {
  title: "Upload · ROI Dashboard",
};

type PageProps = {
  params: Promise<{ uploadId: string }>;
};

export default async function UploadDetailPage({ params }: PageProps) {
  const { uploadId } = await params;
  const ctx = await requireCompany();

  const upload = await db.upload.findFirst({
    where: { id: uploadId, companyId: ctx.companyId },
  });
  if (!upload) notFound();

  // Render immediately with stored data (rule-based fallback if the AI narrative
  // is missing). The slow AI backfill runs client-side via <NarrativeBackfill>
  // below and refreshes the route when content lands. AI-free check here.
  const needsNarrative =
    upload.status === "READY"
      ? await scopeNeedsNarrative({ companyId: ctx.companyId, uploadId: upload.id })
      : false;

  const metrics =
    upload.status === "READY"
      ? await computeMetrics({ companyId: ctx.companyId, uploadId: upload.id })
      : null;

  const warnings = Array.isArray(upload.warnings) ? upload.warnings : [];

  return (
    <section className="space-y-8">
      <header className="space-y-3">
        <nav className="text-muted-foreground flex items-center gap-2 text-xs">
          <Link href="/uploads" className="hover:text-foreground">
            Uploads
          </Link>
          <span aria-hidden>→</span>
          <span className="text-foreground font-mono">{upload.filename}</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-[-0.02em] break-words">
              {upload.filename}
            </h1>
            <UploadStatusBadge status={upload.status} />
          </div>
          <DeleteUploadButton
            uploadId={upload.id}
            filename={upload.filename}
            variant="button"
            onDeletedRedirectTo="/uploads"
          />
        </div>
        <p className="text-muted-foreground text-sm">
          <span className="font-numeric">{upload.rowCount}</span> imported ·{" "}
          <span className="font-numeric">{upload.skippedRows}</span> skipped · target{" "}
          <span className="font-numeric">{(Number(upload.targetMargin) * 100).toFixed(0)}%</span>{" "}
          margin
        </p>
      </header>

      {upload.status === "FAILED" && (
        <div className="border-destructive/40 border-l-2 pl-4">
          <p className="text-destructive text-sm">
            Import failed: {upload.errorMessage ?? "unknown error"}
          </p>
        </div>
      )}

      {upload.status === "READY" && (
        <NarrativeBackfill scope={upload.id} enabled={needsNarrative} />
      )}

      {metrics && (
        <>
          <ProfitPulseWidget data={metrics.profitPulse} />
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <JobHealthWidget data={metrics.jobHealth} />
            <CashFlowWidget data={metrics.cashFlow} />
          </div>
          <TopInsightsWidget data={metrics.topInsights} />
        </>
      )}

      {warnings.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-baseline justify-between">
              <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                Warnings
              </span>
              <span className="font-numeric text-muted-foreground text-xs">{warnings.length}</span>
            </div>
            <ul className="border-accent max-h-64 space-y-1.5 overflow-auto border-l-2 pl-4 text-xs">
              {warnings.slice(0, 50).map((warning, idx) => {
                const w = warning as {
                  rowIndex: number;
                  jobId: string | null;
                  field: string | null;
                  level: string;
                  message: string;
                };
                return (
                  <li key={`w-${idx}`} className="text-muted-foreground">
                    <span className="font-mono text-[10px]">row {w.rowIndex}</span>
                    {w.jobId ? ` · ${w.jobId}` : ""} — {w.message}
                  </li>
                );
              })}
              {warnings.length > 50 && (
                <li className="text-muted-foreground italic">… and {warnings.length - 50} more</li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function UploadStatusBadge({ status }: { status: "PROCESSING" | "READY" | "FAILED" }) {
  const map = {
    READY: { variant: "secondary" as const, label: "Ready" },
    PROCESSING: { variant: "ghost" as const, label: "Processing" },
    FAILED: { variant: "destructive" as const, label: "Failed" },
  };
  const { variant, label } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}
