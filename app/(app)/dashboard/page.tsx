import Link from "next/link";
import { LineChart, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireCompany } from "@/lib/auth";
import { computeExtendedMetrics, ALL_UPLOADS } from "@/lib/metrics/engine";
import { scopeNeedsNarrative } from "@/lib/insights/ensure-narrative";
import { NarrativeBackfill } from "@/components/insights/narrative-backfill";
import { db } from "@/lib/db";
import { ProfitPulseWidget } from "@/components/widgets/profit-pulse";
import { JobHealthWidget } from "@/components/widgets/job-health";
import { CashFlowWidget } from "@/components/widgets/cash-flow";
import { TopInsightsWidget } from "@/components/widgets/top-insights";
import { ExecutivePriorityWidget } from "@/components/widgets/executive-priority";
import { WeeklyPrioritiesWidget } from "@/components/widgets/weekly-priorities";
import { UploadSwitcher, ALL_UPLOADS_VALUE } from "@/components/upload-switcher";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export const metadata = {
  title: "Dashboard · ROI Dashboard",
};

type PageProps = {
  searchParams: Promise<{ uploadId?: string }>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const ctx = await requireCompany();
  const { uploadId } = await searchParams;

  const uploads = await db.upload.findMany({
    where: { companyId: ctx.companyId, status: "READY" },
    orderBy: { uploadedAt: "desc" },
    take: 20,
    select: { id: true, filename: true, uploadedAt: true, rowCount: true },
  });

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 right-0 -z-10 h-80 w-full max-w-[520px] bg-[radial-gradient(circle_at_top_right,oklch(0.56_0.22_290_/_0.14),transparent_70%)]"
      />
      {uploads.length === 0 ? (
        <section className="space-y-8">
          <PageHeader
            eyebrow="Workspace"
            title="Dashboard"
            description="Upload a CSV or XLSX of your jobs to see performance metrics here."
          />
          <EmptyState
            icon={LineChart}
            title="No uploads yet"
            description="We'll walk you through column mapping, then compute every metric."
            action={
              <Button asChild variant="accent" size="lg">
                <Link href="/uploads/new">
                  <Upload className="size-4" />
                  Upload a file
                </Link>
              </Button>
            }
          />
        </section>
      ) : (
        // Default to the ALL aggregate view when no specific upload is selected.
        // scopeNeedsNarrative + <NarrativeBackfill> generate the aggregate AI report
        // on first view if it's missing, so it always reflects every uploaded file.
        <DashboardContent
          uploads={uploads}
          selectedUploadId={uploadId ?? ALL_UPLOADS_VALUE}
          companyId={ctx.companyId}
        />
      )}
    </div>
  );
}

async function DashboardContent({
  uploads,
  selectedUploadId,
  companyId,
}: {
  uploads: Array<{ id: string; filename: string; uploadedAt: Date; rowCount: number }>;
  selectedUploadId?: string;
  companyId: string;
}) {
  const isAllView = selectedUploadId === ALL_UPLOADS_VALUE;
  const scopeUploadId = isAllView ? ALL_UPLOADS : selectedUploadId;

  // Render immediately with whatever's stored (rule-based fallback if the AI
  // narrative is missing). The slow AI backfill is kicked off client-side by
  // <NarrativeBackfill> below, which refreshes the route when content lands —
  // so old data no longer blocks behind a full-page loader. AI-free check here.
  const needsNarrative = await scopeNeedsNarrative({ companyId, uploadId: scopeUploadId });

  const metrics = await computeExtendedMetrics({
    companyId,
    uploadId: scopeUploadId,
  });

  const activeUpload = isAllView
    ? null
    : selectedUploadId
      ? (uploads.find((u) => u.id === selectedUploadId) ?? uploads[0])
      : uploads[0];

  const switcherActiveId = isAllView ? ALL_UPLOADS_VALUE : (activeUpload?.id ?? null);

  const description = isAllView ? (
    <>
      Aggregate across <span className="font-numeric">{uploads.length}</span>{" "}
      {uploads.length === 1 ? "upload" : "uploads"} —{" "}
      <span className="font-numeric">
        {uploads.reduce((acc, u) => acc + u.rowCount, 0).toLocaleString()}
      </span>{" "}
      jobs combined.
    </>
  ) : activeUpload ? (
    <>
      Showing metrics for{" "}
      <Link
        className="text-foreground font-mono underline-offset-4 hover:underline"
        href={`/uploads/${activeUpload.id}`}
      >
        {activeUpload.filename}
      </Link>
    </>
  ) : (
    "Select an upload to view metrics."
  );

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow={isAllView ? "All uploads" : "Performance"}
        title="Dashboard"
        description={description}
        action={
          <UploadSwitcher
            uploads={uploads.map((u) => ({ id: u.id, filename: u.filename }))}
            activeId={switcherActiveId}
          />
        }
      />

      <NarrativeBackfill
        scope={isAllView ? ALL_UPLOADS_VALUE : (activeUpload?.id ?? "")}
        enabled={needsNarrative}
      />

      {metrics && (activeUpload || isAllView) ? (
        <>
          {metrics.executivePriority && (
            <ExecutivePriorityWidget data={metrics.executivePriority} aiPending={needsNarrative} />
          )}
          <ProfitPulseWidget data={metrics.profitPulse} />
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            <JobHealthWidget data={metrics.jobHealth} />
            <CashFlowWidget data={metrics.cashFlow} />
          </div>
          <TopInsightsWidget data={metrics.topInsights} />
          <WeeklyPrioritiesWidget data={metrics.weeklyPriorities} aiPending={needsNarrative} />
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground text-sm">No metrics available.</p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
