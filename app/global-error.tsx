"use client";

import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-semibold">Something went wrong.</h1>
          <p className="text-muted-foreground text-sm">
            An unexpected error occurred. Try again, or reload the page.
          </p>
          {error.digest && (
            <p className="text-muted-foreground font-mono text-xs">Ref: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
