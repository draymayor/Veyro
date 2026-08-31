"use client";

import { useState } from "react";
import { PriceSparkline } from "@/components/crypto/price-sparkline";
import {
  BALANCE_HISTORY_PERIODS,
  type BalanceHistoryPeriod,
} from "@/lib/dashboard/get-wallet-summary";
import {
  formatWalletAmount,
  type WalletCurrency,
} from "@/lib/dashboard/wallet-currency";
import { cn } from "@/lib/utils";

interface BalancePnlChartProps {
  currency: WalletCurrency;
  /** The wallet's own currency, history's values are denominated in this. */
  baseCurrency: WalletCurrency;
  history: Record<BalanceHistoryPeriod, number[]>;
  liveRatesPerUsd?: Record<string, number>;
  /** ISO timestamp captured server-side when the wallet summary was fetched (get-wallet-summary.ts). */
  asOf: string;
}

const PERIOD_LABEL: Record<BalanceHistoryPeriod, string> = {
  "7d": "7d",
  "30d": "30d",
  "90d": "90d",
  "180d": "180d",
};

/**
 * Balance trend chart below the P&L line, structural/layout inspiration
 * from the reference exchange app, remapped to Veyro's light theme and
 * existing green/red PriceSparkline treatment (docs/design-principles.md's
 * Rate/Price Card Patterns) rather than the reference's single brand-color
 * line. history is resampled from the real wallet_transactions ledger
 * (get-wallet-summary.ts), not illustrative data.
 */
export function BalancePnlChart({
  currency,
  baseCurrency,
  history,
  liveRatesPerUsd,
  asOf,
}: BalancePnlChartProps) {
  const [period, setPeriod] = useState<BalanceHistoryPeriod>("7d");
  const series = history[period];
  const hasData = series.length > 0;
  const max = hasData ? Math.max(...series) : 0;
  const min = hasData ? Math.min(...series) : 0;
  const positive = hasData ? series[series.length - 1] >= series[0] : true;

  return (
    <div className="mt-5">
      <div className="relative h-28 w-full sm:h-32">
        <span className="text-ink/40 absolute top-0 right-0 text-[11px] tabular-nums">
          {formatWalletAmount(max, baseCurrency, currency, liveRatesPerUsd)}
        </span>
        <span className="text-ink/40 absolute bottom-0 left-0 text-[11px] tabular-nums">
          {formatWalletAmount(min, baseCurrency, currency, liveRatesPerUsd)}
        </span>
        <PriceSparkline
          history={hasData ? series : [0, 0]}
          positive={positive}
          className="h-full w-full"
        />
      </div>

      <div className="mt-3 flex items-center gap-1">
        {BALANCE_HISTORY_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              p === period
                ? "bg-secondary text-ink"
                : "text-ink/40 hover:text-ink/60",
            )}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>

      <p className="text-ink/40 mt-2 text-xs">
        Updated{" "}
        {new Date(asOf).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
          timeZoneName: "short",
        })}
      </p>
    </div>
  );
}
