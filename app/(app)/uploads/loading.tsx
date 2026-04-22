import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UploadsLoading() {
  return (
    <section className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Card>
        <CardContent className="space-y-3 p-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b px-4 py-3 last:border-0"
            >
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
