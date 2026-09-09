"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";

export type NetworkFeeAvailability = "live" | "fixed" | "unavailable";

/** Mirrors NetworkFeeRow from apps/api/src/network-fees/network-fees.service.ts. */
export interface NetworkFee {
  network: string;
  nativeSymbol: string;
  availability: NetworkFeeAvailability;
  transferFeeNative?: number;
  transferFeeUsd?: number;
  tokenTransferFeeNative?: number;
  tokenTransferFeeUsd?: number;
  tokenSymbolsLabel?: string;
  source: string;
  reason?: string;
}

interface UseNetworkFeeResult {
  fee: NetworkFee | null;
  loading: boolean;
  error: boolean;
}

/**
 * Live network fee for the crypto withdrawal amount screen, from
 * GET /withdrawals/crypto/network-fee - the exact same NetworkFeesService
 * lookup the admin Network Fees panel and the sweeper/consolidator already
 * use for this chain, not a separate estimate. `network` must be a
 * CryptoNetwork.label value (e.g. "Bitcoin", "ERC20", "TRC20").
 */
export function useNetworkFee(network: string): UseNetworkFeeResult {
  const [fee, setFee] = useState<NetworkFee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!cancelled) {
        setLoading(true);
        setError(false);
      }
      try {
        const data = await authFetch<NetworkFee>(
          `/withdrawals/crypto/network-fee?${new URLSearchParams({ network }).toString()}`,
        );
        if (!cancelled) {
          setFee(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFee(null);
          setError(true);
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [network]);

  return { fee, loading, error };
}
