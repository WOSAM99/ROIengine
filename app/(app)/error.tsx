"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error(error);
    }
  }, [error]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Something went wrong</CardTitle>
        <CardDescription>
          We couldn&apos;t load this view. Try again, or head back to the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">Ref: {error.digest}</p>
        )}
        <div className="flex gap-2">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild>
            <a href="/dashboard">Back to dashboard</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
