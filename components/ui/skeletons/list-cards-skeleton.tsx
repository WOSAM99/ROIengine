import { Skeleton } from "@/components/ui/skeleton";

type ListCardsSkeletonProps = {
  /** How many placeholder cards to render. Defaults to 6. */
  count?: number;
  /** When true, shows a two-row page header above the grid. */
  header?: boolean;
};

export function ListCardsSkeleton({ count = 6, header = true }: ListCardsSkeletonProps) {
  return (
    <section className="space-y-8" aria-busy="true" aria-live="polite">
      {header && (
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <li key={i}>
            <div className="bg-card shadow-card flex h-full flex-col gap-4 rounded-2xl border border-black/5 p-5">
              <div className="flex items-start gap-3">
                <Skeleton className="size-9 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="border-border/60 mt-auto grid grid-cols-2 gap-3 border-t pt-4">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-12" />
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
