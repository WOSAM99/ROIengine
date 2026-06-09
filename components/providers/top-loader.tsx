"use client";

import NextTopLoader from "nextjs-toploader";

/**
 * Route-transition progress bar. Renders a thin violet bar at the top of the
 * viewport during Next.js navigations so a click gives immediate feedback.
 * The color matches the design system accent (`--accent`, violet).
 */
export default function TopLoader() {
  return (
    <NextTopLoader
      color="oklch(0.56 0.22 290)"
      height={3}
      showSpinner={false}
      shadow="0 0 10px oklch(0.56 0.22 290 / 0.5)"
    />
  );
}
