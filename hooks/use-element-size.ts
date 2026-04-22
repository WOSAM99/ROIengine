"use client";

import { useCallback, useRef, useSyncExternalStore, type RefObject } from "react";

export type ElementSize = { width: number; height: number };

const ZERO: ElementSize = { width: 0, height: 0 };
const SERVER_SNAPSHOT = () => ZERO;

/**
 * Track a DOM element's content-box size via ResizeObserver.
 *
 * Implemented with `useSyncExternalStore` (React's recommended primitive for
 * external subscriptions) so there's no `useEffect` + `setState` pattern —
 * which means no `react-hooks/set-state-in-effect` lint hit, no extra renders,
 * and zero SSR/hydration mismatch (the server snapshot is a stable 0×0 object).
 *
 * Returns `{ width: 0, height: 0 }` until the first measurement lands; callers
 * should guard against rendering size-sensitive children (e.g. Recharts) until
 * both dimensions are > 0.
 */
export function useElementSize<T extends HTMLElement>(ref: RefObject<T | null>): ElementSize {
  // Cached snapshot persists across renders so useSyncExternalStore's
  // referential-equality bail-out keeps working between notifications.
  const cacheRef = useRef<ElementSize>(ZERO);

  const subscribe = useCallback(
    (notify: () => void) => {
      const el = ref.current;
      if (!el || typeof ResizeObserver === "undefined") return () => {};
      const observer = new ResizeObserver(() => notify());
      observer.observe(el);
      return () => observer.disconnect();
    },
    [ref],
  );

  const getSnapshot = useCallback((): ElementSize => {
    const el = ref.current;
    if (!el) return cacheRef.current;
    const rect = el.getBoundingClientRect();
    if (rect.width === cacheRef.current.width && rect.height === cacheRef.current.height) {
      return cacheRef.current;
    }
    cacheRef.current = { width: rect.width, height: rect.height };
    return cacheRef.current;
  }, [ref]);

  return useSyncExternalStore(subscribe, getSnapshot, SERVER_SNAPSHOT);
}
