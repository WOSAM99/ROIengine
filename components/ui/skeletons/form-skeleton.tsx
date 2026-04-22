import { Skeleton } from "@/components/ui/skeleton";

type FormSkeletonProps = {
  /** Number of field rows. Defaults to 3. */
  fields?: number;
  /** Render a submit row at the bottom. Defaults to true. */
  submit?: boolean;
};

export function FormSkeleton({ fields = 3, submit = true }: FormSkeletonProps) {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      {submit && (
        <div className="flex justify-end pt-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      )}
    </div>
  );
}
