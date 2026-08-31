"use client";

import { useEffect, useState } from "react";

/**
 * Delays reflecting a fast-changing value (e.g. a free-typed amount field)
 * by `delayMs`, so callers driving a network request off it (a live payout
 * quote) don't fire one per keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
