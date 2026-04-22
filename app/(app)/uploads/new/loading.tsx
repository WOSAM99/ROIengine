import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewUploadLoading() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-36 w-full" />
        </CardContent>
      </Card>
    </section>
  );
}
