"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";

export interface DepositAddressResult {
  address: string | null;
  /**
   * The chain's destination tag/memo distinguishing this user's deposits
   * at a shared platform address (XRP's destination_tag, Stellar's memo) -
   * null for every chain that gets its own unique derived address.
   */
  destinationTag: string | null;
  loading: boolean;
  error: string | null;
}

interface DepositAddressResponse {
  address: string;
  destinationTag: string | null;
}

/**
 * Fetches the signed-in user's real deposit address (and destination
 * tag/memo, where the chain uses one) from
 * GET /crypto-addresses/:symbol/:network - generated lazily server-side
 * via Tatum on first request (CryptoAddressesService), never a
 * placeholder. `assetNetwork` must be CryptoNetwork.assetNetwork
 * (lib/crypto/data.ts), the exact crypto_assets.network value, not the
 * display label.
 */
export function useDepositAddress(
  symbol: string,
  assetNetwork: string,
): DepositAddressResult {
  const [address, setAddress] = useState<string | null>(null);
  const [destinationTag, setDestinationTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset state during render (not in the effect below) when the requested
  // symbol/network changes, per React's "adjusting state when a prop
  // changes" pattern - avoids the effect synchronously calling setState
  // before its async fetch even starts.
  const requestKey = `${symbol}:${assetNetwork}`;
  const [lastRequestKey, setLastRequestKey] = useState(requestKey);
  if (requestKey !== lastRequestKey) {
    setLastRequestKey(requestKey);
    setLoading(true);
    setError(null);
    setAddress(null);
    setDestinationTag(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await authFetch<DepositAddressResponse>(
          `/crypto-addresses/${encodeURIComponent(symbol)}/${encodeURIComponent(assetNetwork)}`,
        );
        if (cancelled) return;
        setAddress(data.address);
        setDestinationTag(data.destinationTag ?? null);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your deposit address.",
        );
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [symbol, assetNetwork]);

  return { address, destinationTag, loading, error };
}
