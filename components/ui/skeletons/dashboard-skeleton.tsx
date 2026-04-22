import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard loader matching the ProfitPulse + JobHealth + CashFlow + TopInsights
 * grid. Mirrors the exact layout of `app/(app)/dashboard/page.tsx` so the
 * transition from skeleton → content is invisible.
 */
export function DashboardSkeleton() {
  return (
    <section className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Profit Pulse: 6 metric cards */}
      <div className="space-y-4">
        <Skeleton className="h-3 w-28" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* JobHealth + CashFlow + TopInsights */}
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-60 rounded-2xl lg:col-span-2" />
      </div>
    </section>
  );
}
