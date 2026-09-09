import type { CryptoAsset, CryptoNetwork } from "@/lib/crypto/data";
import type { NetworkFee } from "@/lib/crypto/use-network-fee";

interface NetworkFeeSummaryProps {
  asset: CryptoAsset;
  network: CryptoNetwork;
  amount: number;
  fee: NetworkFee | null;
  loading: boolean;
}

function formatNative(value: number, symbol: string): string {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${symbol}`;
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  });
}

/**
 * Shows what the withdrawal will actually cost and receive before the user
 * confirms: the live per-chain network fee (reusing NetworkFeesService, the
 * same live lookup the admin Network Fees panel and the sweeper/consolidator
 * use) and the exact amount the user receives. Fee is paid on top from the
 * consolidation wallet, never subtracted from the withdrawal - "You'll
 * receive" always equals the entered amount, and the fee line is
 * deliberately never phrased as coming out of it.
 */
export function NetworkFeeSummary({
  asset,
  network,
  amount,
  fee,
  loading,
}: NetworkFeeSummaryProps) {
  const isToken = asset.symbol !== fee?.nativeSymbol;
  const feeNative =
    isToken && fee?.tokenTransferFeeNative !== undefined
      ? fee.tokenTransferFeeNative
      : fee?.transferFeeNative;
  const feeUsd =
    isToken && fee?.tokenTransferFeeUsd !== undefined
      ? fee.tokenTransferFeeUsd
      : fee?.transferFeeUsd;

  const feeSymbol = fee?.nativeSymbol ?? network.label;

  return (
    <div className="border-border bg-secondary/40 flex flex-col gap-1.5 rounded-xl border p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-ink/60">
          Network fee
          {fee?.availability === "live" ? (
            <span className="text-success ml-1.5">&bull; Live</span>
          ) : fee?.availability === "fixed" ? (
            <span className="text-ink/40 ml-1.5">&bull; Fixed rate</span>
          ) : null}
        </span>
        {loading ? (
          <span className="text-ink/40">Estimating...</span>
        ) : fee &&
          fee.availability !== "unavailable" &&
          feeNative !== undefined ? (
          <span className="text-ink text-right font-medium tabular-nums">
            {formatNative(feeNative, feeSymbol)}
            {feeUsd !== undefined ? (
              <span className="text-ink/45 ml-1 font-normal">
                (~{formatUsd(feeUsd)})
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-ink/40">Unavailable right now</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-ink/60">You&apos;ll receive</span>
        <span className="text-ink font-medium tabular-nums">
          {formatNative(amount, asset.symbol)}
        </span>
      </div>

      <p className="text-ink/40">
        The network fee is covered by Veyro and paid on top - it is never
        deducted from the amount you receive.
      </p>
    </div>
  );
}
