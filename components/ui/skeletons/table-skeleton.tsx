import { Skeleton } from "@/components/ui/skeleton";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function TableSkeleton({ rows = 8, columns = 5 }: TableSkeletonProps) {
  return (
    <div
      className="border-border/80 bg-card overflow-hidden rounded-xl border"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Header */}
      <div
        className="bg-muted/40 grid gap-4 px-3 py-2.5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-3 w-20" />
        ))}
      </div>
      {/* Body */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={`r-${r}`}
          className="border-border/40 grid gap-4 border-t px-3 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={`c-${r}-${c}`}
              className="h-4"
              style={{ width: `${50 + ((r * 7 + c * 13) % 40)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
