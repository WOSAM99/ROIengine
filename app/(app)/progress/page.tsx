import { TrendingUp } from "lucide-react";
import { requireCompany } from "@/lib/auth";
import { computeProgress } from "@/lib/progress/compute-progress";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { HealthScoreTimeline } from "@/components/progress/health-score-timeline";
import { BeforeAfterComparison } from "@/components/progress/before-after-comparison";
import { ConstraintShiftCard } from "@/components/progress/constraint-shift-card";
import { ActionValidationCard } from "@/components/progress/action-validation-card";

export const metadata = { title: "Progress · ROI Dashboard" };

export default async function ProgressPage() {
  const ctx = await requireCompany();
  const timeline = await computeProgress(ctx.companyId);

  if (!timeline) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No upload history yet"
        description="Upload at least one file to start tracking your progress over time."
      />
    );
  }

  const periods = timeline.periods;
  const previous = periods.length >= 2 ? periods[periods.length - 2] : null;
  const current = periods.length >= 2 ? periods[periods.length - 1] : null;

  return (
    <section className="space-y-8">
      <PageHeader
        eyebrow="Performance"
        title="Progress Timeline"
        description="Sheet-by-sheet improvement tracking across every uploaded file."
      />
      <HealthScoreTimeline periods={timeline.periods} />
      {timeline.actionValidations.length > 0 && (
        <ActionValidationCard validations={timeline.actionValidations} />
      )}
      {previous &&
        current &&
        timeline.latestVsPrevious &&
        timeline.previousLabel &&
        timeline.currentLabel && (
          <BeforeAfterComparison
            previous={previous.snapshot}
            current={current.snapshot}
            previousLabel={timeline.previousLabel}
            currentLabel={timeline.currentLabel}
            delta={timeline.latestVsPrevious}
          />
        )}
      {timeline.constraintShift && <ConstraintShiftCard message={timeline.constraintShift} />}
    </section>
  );
}
