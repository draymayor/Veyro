"use client";

import { useEffect, useState } from "react";

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
}

/**
 * Fetches live crypto prices from GET /crypto/rates (real CoinGecko data,
 * server-cached). Used wherever the app shows a crypto price, so there is
 * a single fetch shape and a single loading/error contract for callers to
 * handle instead of each screen inventing its own.
 */
export function useCryptoRates(): UseCryptoRatesResult {
  const [rates, setRates] = useState<CryptoRatesMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/crypto/rates`,
        );
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as CryptoRatesMap;
        if (!cancelled) {
          setRates(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rates, loading, error };
}
