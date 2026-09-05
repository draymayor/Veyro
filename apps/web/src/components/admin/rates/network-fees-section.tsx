"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";
import type {
  AdminNetworkFee,
  AdminNetworkFeesResponse,
  NetworkFeeAvailability,
} from "@/lib/admin/rates/types";

function formatNative(value: number | undefined, symbol: string): string {
  if (value === undefined) return "-";
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value < 1 ? 8 : 4,
  }).format(value)} ${symbol}`;
}

function formatUsd(value: number | undefined): string {
  if (value === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

const AVAILABILITY_LABEL: Record<NetworkFeeAvailability, string> = {
  live: "Live",
  fixed: "Fixed",
  unavailable: "Unavailable",
};

const AVAILABILITY_CLASS: Record<NetworkFeeAvailability, string> = {
  live: "bg-emerald-500/10 text-emerald-600",
  fixed: "bg-amber-500/10 text-amber-600",
  unavailable: "bg-ink/10 text-ink/50",
};

/**
 * Network Fees (Rate Management's Platform Settings area): read-only,
 * never admin-editable - these are real external network costs Veyro
 * doesn't set, not a platform_settings row. One number per chain
 * represents BOTH what a user withdrawal currently costs to send and what
 * a sweep currently costs to consolidate, since they're the same real
 * on-chain cost triggered by two different internal events (see
 * apps/sweeper and apps/consolidator).
 *
 * Sourced from GET /admin/rates/network-fees (NetworkFeesService), which
 * reuses the exact fee sources already proven live tonight rather than a
 * fresh calculation - see that service's own doc comment for the full
 * breakdown of which chain uses which real source. `availability` marks
 * which case a given row is:
 *  - live: a genuine live lookup right now (BTC/LTC/DOGE via Tatum's fee
 *    endpoint, ETH the same way).
 *  - fixed: a real value, but not live - currently just TRX, which has no
 *    live fee-estimation call anywhere in this codebase yet (shown
 *    honestly rather than dressed up as live).
 *  - unavailable: no real number to show - the 13 other EVM networks,
 *    since Tatum's fee endpoint only covers ETH/BTC/LTC/DOGE (confirmed
 *    live, not assumed).
 */
export function NetworkFeesSection({
  initial,
}: {
  initial: AdminNetworkFeesResponse;
}) {
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setError(null);
    setRefreshing(true);
    try {
      const fresh = await authFetch<AdminNetworkFeesResponse>(
        "/admin/rates/network-fees",
      );
      setData(fresh);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not refresh network fees.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-ink text-base font-semibold">
            Network Fees
          </h2>
          <p className="text-ink/50 max-w-2xl text-xs">
            Real, live-estimated cost of moving funds on each network - not a
            Veyro setting. The same number covers both a user withdrawal
            (sending funds out) and a sweep/consolidation (moving deposits
            internally), since both pay the identical real network fee, just
            triggered by different events. Read-only.
          </p>
        </div>
        <Button size="sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <p className="text-ink/40 text-xs">
        As of{" "}
        {new Date(data.asOf).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        })}
        {error ? <span className="text-error"> - {error}</span> : null}
      </p>

      <div className="border-border overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-border text-ink/45 border-b text-xs font-medium">
              <th className="px-3 py-2 font-medium">Network</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Native transfer fee</th>
              <th className="px-3 py-2 font-medium">USD</th>
              <th className="px-3 py-2 font-medium">Token transfer fee</th>
              <th className="px-3 py-2 font-medium">Source / note</th>
            </tr>
          </thead>
          <tbody>
            {data.fees.map((fee) => (
              <NetworkFeeRow key={fee.network} fee={fee} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function NetworkFeeRow({ fee }: { fee: AdminNetworkFee }) {
  return (
    <tr className="border-border/60 border-b align-top last:border-0">
      <td className="px-3 py-2">
        <span className="text-ink block font-medium">{fee.network}</span>
        <span className="text-ink/40 block text-[11px]">
          {fee.nativeSymbol}
        </span>
      </td>
      <td className="px-3 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${AVAILABILITY_CLASS[fee.availability]}`}
        >
          {AVAILABILITY_LABEL[fee.availability]}
        </span>
      </td>
      <td className="px-3 py-2">
        {formatNative(fee.transferFeeNative, fee.nativeSymbol)}
      </td>
      <td className="px-3 py-2">{formatUsd(fee.transferFeeUsd)}</td>
      <td className="px-3 py-2">
        {fee.tokenTransferFeeNative !== undefined ? (
          <>
            {formatNative(fee.tokenTransferFeeNative, fee.nativeSymbol)}
            {fee.tokenTransferFeeUsd !== undefined ? (
              <span className="text-ink/50">
                {" "}
                ({formatUsd(fee.tokenTransferFeeUsd)})
              </span>
            ) : null}
            {fee.tokenSymbolsLabel ? (
              <span className="text-ink/40 block text-[11px]">
                {fee.tokenSymbolsLabel}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-ink/30">-</span>
        )}
      </td>
      <td className="text-ink/50 px-3 py-2 text-xs">
        {fee.reason ?? fee.source}
      </td>
    </tr>
  );
}
