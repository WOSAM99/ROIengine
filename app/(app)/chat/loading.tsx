import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-48 rounded-full" />
        ))}
      </div>
    </section>
  );
}
