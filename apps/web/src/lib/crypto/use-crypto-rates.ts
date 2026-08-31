"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base-url";

export interface CryptoRate {
  priceUsd: number;
  change24h: number;
  /** Price points over the last 7 days, chronological, for a sparkline. */
  history: number[];
}

export type CryptoRatesMap = Record<string, CryptoRate>;

interface UseCryptoRatesResult {
  rates: CryptoRatesMap | null;
  loading: boolean;
  error: boolean;
  /** Timestamp (Date.now()) of the last successful fetch, for driving a refresh countdown. */
  refreshedAt: number | null;
}

/**
 * Fetches live crypto prices from GET /crypto/rates (real CoinGecko data,
 * server-cached). Used wherever the app shows a crypto price, so there is
 * a single fetch shape and a single loading/error contract for callers to
 * handle instead of each screen inventing its own.
 *
 * @param pollMs When provided, refetches on this interval (e.g. 30_000 for
 * the sell flow's live payout preview) instead of fetching once on mount.
 * Refetch failures don't clear already-loaded rates, since a stale price
 * is more useful to a mid-entry user than a blank/error state.
 */
export function useCryptoRates(pollMs?: number): UseCryptoRatesResult {
  const [rates, setRates] = useState<CryptoRatesMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/crypto/rates`);
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as CryptoRatesMap;
        if (!cancelled) {
          setRates(data);
          setLoading(false);
          setError(false);
          setRefreshedAt(Date.now());
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

  return { rates, loading, error, refreshedAt };
}
