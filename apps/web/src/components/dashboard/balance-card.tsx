"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { BalancePnlChart } from "./balance-pnl-chart";
import { DepositWithdrawButtons } from "./deposit-withdraw-panel";
import { WalletCurrencySelect } from "./wallet-currency-select";
import type { BalanceHistoryPeriod } from "@/lib/dashboard/get-wallet-summary";
import {
  formatWalletAmount,
  walletAmountValue,
  walletCurrencyOptions,
  type WalletCurrency,
} from "@/lib/dashboard/wallet-currency";
import { useBalanceVisibility } from "@/lib/dashboard/use-balance-visibility";
import { useFxRates } from "@/lib/fx/use-fx-rates";
import { useCryptoRates } from "@/lib/crypto/use-crypto-rates";
import { cn } from "@/lib/utils";

interface BalanceCardCryptoHolding {
  symbol: string;
  balance: number;
}

interface BalanceCardProps {
  /** The signed-in user's actual wallet currency, set at signup from their country. */
  homeCurrency: WalletCurrency;
  /** The fiat wallet's real cached balance, denominated in homeCurrency. */
  balance: number;
  /**
   * Every held crypto_wallets balance, converted via live CoinGecko price +
   * FX rate (same logic CryptoPayoutService/useCryptoPayout use for a sell
   * quote, minus the margin markdown) and added on top of the fiat balance
   * above, so the headline figure is the user's real total net worth on
   * the platform, not just their fiat sub-balance. Defaults to none, for
   * screens that haven't fetched crypto holdings.
   */
  cryptoBalances?: BalanceCardCryptoHolding[];
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
  cryptoBalances = [],
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
  const { rates: cryptoRates } = useCryptoRates(FX_REFRESH_MS);

  // Raw CoinGecko USD price per held symbol, no margin markdown - this is
  // a net-worth figure, not a sell quote, so CryptoPayoutService's payout
  // formula (which marks the price down) doesn't apply here.
  const cryptoValueUsd = cryptoBalances.reduce(
    (sum, { symbol, balance: symbolBalance }) =>
      sum + symbolBalance * (cryptoRates?.[symbol]?.priceUsd ?? 0),
    0,
  );
  // Same walletAmountValue conversion every other figure on this card goes
  // through, just converting from USD (what CoinGecko prices in) rather
  // than from homeCurrency.
  const cryptoValueInHomeCurrency = walletAmountValue(
    cryptoValueUsd,
    "USD",
    homeCurrency,
    fxRates ?? undefined,
  );
  const combinedBalance = balance + cryptoValueInHomeCurrency;

  // Standard mark-to-market portfolio P&L: today's change is priced against
  // the whole net-worth figure above, not just the fiat wallet's ledger
  // deltas, otherwise a user who's mostly holding crypto would see a "Today's
  // P&L" that ignores the actual price move driving their balance. There's
  // no stored historical crypto balance/price ledger to compute an exact
  // start-of-day snapshot from (unlike the fiat wallet_transactions table),
  // so this reconstructs "24h ago value" from CoinGecko's own change24h
  // percentage against currently-held quantities - the same approximation
  // most portfolio trackers make absent a full historical ledger. This
  // ignores any crypto bought/sold/withdrawn earlier today, same tradeoff
  // change24h itself makes.
  const cryptoValueUsd24hAgo = cryptoBalances.reduce(
    (sum, { symbol, balance: symbolBalance }) => {
      const rate = cryptoRates?.[symbol];
      if (!rate) return sum;
      const priorDivisor = 1 + rate.change24h / 100;
      if (!Number.isFinite(priorDivisor) || priorDivisor <= 0) return sum;
      return sum + (symbolBalance * rate.priceUsd) / priorDivisor;
    },
    0,
  );
  const cryptoPnlInHomeCurrency = walletAmountValue(
    cryptoValueUsd - cryptoValueUsd24hAgo,
    "USD",
    homeCurrency,
    fxRates ?? undefined,
  );
  const cryptoValue24hAgoInHomeCurrency = walletAmountValue(
    cryptoValueUsd24hAgo,
    "USD",
    homeCurrency,
    fxRates ?? undefined,
  );

  const combinedPnlAmount = todayPnl.amount + cryptoPnlInHomeCurrency;
  const fiatBalanceStartOfDay = balance - todayPnl.amount;
  const combinedStartOfDayValue =
    fiatBalanceStartOfDay + cryptoValue24hAgoInHomeCurrency;
  const combinedPnlPercent =
    combinedStartOfDayValue > 0
      ? (combinedPnlAmount / combinedStartOfDayValue) * 100
      : 0;
  const pnlPositive = combinedPnlAmount >= 0;

  const balanceText = formatWalletAmount(
    combinedBalance,
    homeCurrency,
    currency,
    fxRates ?? undefined,
  );
  const pnlText = formatWalletAmount(
    combinedPnlAmount,
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
              : `${pnlPositive ? "+" : ""}${pnlText} (${pnlPositive ? "+" : ""}${combinedPnlPercent.toFixed(2)}%)`}
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
