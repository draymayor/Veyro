"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/lib/api-base-url";

export interface CryptoPayoutQuote {
  payout: number;
  priceUsd: number;
  fxRate: number;
  currency: string;
}

interface UseCryptoPayoutResult {
  quote: CryptoPayoutQuote | null;
  loading: boolean;
  error: boolean;
  /** Timestamp (Date.now()) of the last successful fetch, for driving a refresh countdown. */
  refreshedAt: number | null;
}

/**
 * Fetches Veyro's actual payout quote from GET /crypto/payout: the live
 * CoinGecko price converted to `currency` via the live FX rate, no margin
 * markdown. Distinct from useCryptoRates only in that it also applies the
 * currency conversion.
 *
 * Refetches whenever symbol/network/amount/currency change (callers
 * should debounce a free-typed amount before passing it in) and again
 * every `pollMs`, so the figure stays close to the live price and FX rate
 * while a user is still deciding. Pass amount <= 0 to skip fetching
 * entirely, since there is nothing valid to quote yet.
 */
export function useCryptoPayout(
  symbol: string,
  network: string,
  amount: number,
  currency: string,
  pollMs?: number,
): UseCryptoPayoutResult {
  const [quote, setQuote] = useState<CryptoPayoutQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  useEffect(() => {
    if (amount <= 0) {
      // Nothing valid to quote yet. Skip fetching entirely; the hook
      // returns a hardcoded empty result below regardless of whatever
      // stale internal state a previous valid amount left behind, so
      // there's nothing to reset here.
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const search = new URLSearchParams({
          symbol,
          network,
          amount: String(amount),
          currency,
        });
        const res = await fetch(
          `${getApiBaseUrl()}/crypto/payout?${search.toString()}`,
        );
        if (!res.ok) throw new Error("Request failed");
        const data = (await res.json()) as CryptoPayoutQuote;
        if (!cancelled) {
          setQuote(data);
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

    if (!pollMs) {
      return () => {
        cancelled = true;
      };
    }

    const interval = setInterval(() => void load(), pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [symbol, network, amount, currency, pollMs]);

  if (amount <= 0) {
    return { quote: null, loading: false, error: false, refreshedAt: null };
  }

  return { quote, loading, error, refreshedAt };
}
