"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { BalancePnlChart } from "./balance-pnl-chart";
import { DepositWithdrawButtons } from "./deposit-withdraw-panel";
import { WalletCurrencySelect } from "./wallet-currency-select";
import type { BalanceHistoryPeriod } from "@/lib/dashboard/get-wallet-summary";
import {
  formatWalletAmount,
  walletCurrencyOptions,
  type WalletCurrency,
} from "@/lib/dashboard/wallet-currency";
import { useBalanceVisibility } from "@/lib/dashboard/use-balance-visibility";
import { useFxRates } from "@/lib/fx/use-fx-rates";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  /** The signed-in user's actual wallet currency, set at signup from their country. */
  homeCurrency: WalletCurrency;
  /** The wallet's real cached balance, denominated in homeCurrency. */
  balance: number;
  todayPnl: { amount: number; percent: number };
  /** Assets page only: Home's balance card stays without the trend chart. */
  showChart?: boolean;
  /** Required when showChart is true. */
  history?: Record<BalanceHistoryPeriod, number[]>;
  /** Required when showChart is true. */
  asOf?: string;
}

// Matches the FX cache's refresh cadence elsewhere in the app (crypto
// payout quotes, rate cards), so the balance figure never sits stale next
// to numbers that just updated. No visible countdown here, unlike those
// screens: the balance should just quietly reflect the latest rate.
const FX_REFRESH_MS = 60_000;

// Fixed-width placeholder for a hidden amount, independent of the real
// figure's digit count: matching the digit count would leak roughly how
// large the balance is, which defeats the point of hiding it.
const HIDDEN_AMOUNT_PLACEHOLDER = "******";

/**
 * Visual hero of the center column. No card container, sits directly on
 * the page background like a standard exchange home screen's balance
 * header, not boxed off in its own panel. Balance figure is the largest,
 * most prominent number on the page per docs/design-principles.md.
 */
export function BalanceCard({
  homeCurrency,
  balance,
  todayPnl,
  showChart = false,
  history,
  asOf,
}: BalanceCardProps) {
  const options = walletCurrencyOptions(homeCurrency);
  // Display currency defaults to USD regardless of the user's actual wallet
  // currency, per docs/product-rules.md rule 13: purely cosmetic, the user
  // opts into seeing their own currency (or any other) via the selector
  // below, it's just never the silent default.
  const [currency, setCurrency] = useState<WalletCurrency>("USD");
  const [hidden, toggleHidden] = useBalanceVisibility();
  const { rates: fxRates } = useFxRates(FX_REFRESH_MS);
  const pnlPositive = todayPnl.amount >= 0;

  const balanceText = formatWalletAmount(
    balance,
    homeCurrency,
    currency,
    fxRates ?? undefined,
  );
  const pnlText = formatWalletAmount(
    todayPnl.amount,
    homeCurrency,
    currency,
    fxRates ?? undefined,
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-ink/50 text-sm font-medium">Wallet Balance</p>
          <WalletCurrencySelect
            value={currency}
            options={options}
            onChange={setCurrency}
          />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <p className="font-heading text-ink text-3xl font-semibold tabular-nums sm:text-4xl">
            {hidden ? HIDDEN_AMOUNT_PLACEHOLDER : balanceText}
          </p>
          <button
            type="button"
            onClick={toggleHidden}
            aria-label={hidden ? "Show balance" : "Hide balance"}
            className="text-ink/40 hover:text-ink/60 transition-colors"
          >
            {hidden ? (
              <EyeSlashIcon className="size-5" aria-hidden="true" />
            ) : (
              <EyeIcon className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <p className="text-ink/50 mt-2 text-sm">
          Today&apos;s P&amp;L{" "}
          <span
            className={cn(
              "font-medium tabular-nums",
              pnlPositive ? "text-success" : "text-error",
            )}
          >
            {hidden
              ? HIDDEN_AMOUNT_PLACEHOLDER
              : `${pnlPositive ? "+" : ""}${pnlText} (${pnlPositive ? "+" : ""}${todayPnl.percent.toFixed(2)}%)`}
          </span>
        </p>
        {showChart && !hidden && history && asOf && (
          <BalancePnlChart
            currency={currency}
            baseCurrency={homeCurrency}
            history={history}
            asOf={asOf}
            liveRatesPerUsd={fxRates ?? undefined}
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <DepositWithdrawButtons />
      </div>
    </div>
  );
}
