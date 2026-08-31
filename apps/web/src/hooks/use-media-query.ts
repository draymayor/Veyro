"use client";

import { useSyncExternalStore } from "react";

/**
 * Tracks a media query so components can pick between a desktop and mobile
 * interaction pattern (e.g. dropdown vs. bottom sheet) without duplicating
 * markup behind CSS breakpoints. getServerSnapshot always returns false, so
 * the client's first render matches the SSR-ed HTML; the real value is
 * read via getSnapshot once the browser subscribes, avoiding the hydration
 * mismatch a useState/useEffect version hits (window.matchMedia read
 * during the useState initializer runs on the client's first render too,
 * before React can compare it against the server output).
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
