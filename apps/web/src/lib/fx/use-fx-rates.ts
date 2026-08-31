"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base-url";

/** USD-based rate for each currency (units of that currency per 1 USD). */
export type FxRatesMap = Record<string, number>;

interface UseFxRatesResult {
  rates: FxRatesMap | null;
  loading: boolean;
  error: boolean;
}

/**
 * Fetches live FX rates from GET /fx/rates. Mirrors useCryptoRates' shape
 * (same polling contract, same "keep serving the last good data on a
 * failed refetch" behavior) so every live-updating number in the app
 * follows one pattern.
 *
 * @param pollMs When provided, refetches on this interval instead of
 * fetching once on mount.
 */
export function useFxRates(pollMs?: number): UseFxRatesResult {
  const [rates, setRates] = useState<FxRatesMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/fx/rates`);
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as FxRatesMap;
        if (!cancelled) {
          setRates(data);
          setLoading(false);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    void load();

    if (!pollMs)
      return () => {
        cancelled = true;
      };

    const interval = setInterval(() => void load(), pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs]);

  return { rates, loading, error };
}
