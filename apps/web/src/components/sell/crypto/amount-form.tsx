"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NetworkField } from "@/components/crypto/network-field";
import { PriceSparkline } from "@/components/crypto/price-sparkline";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/sell/confirmation-dialog";
import { authFetch } from "@/lib/api-client";
import {
  networkById,
  splitPriceUsd,
  type CryptoAsset,
} from "@/lib/crypto/data";
import { useCryptoPayout } from "@/lib/crypto/use-crypto-payout";
import { useCryptoRates } from "@/lib/crypto/use-crypto-rates";
import { useAutoRevealScroll } from "@/hooks/use-auto-reveal-scroll";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

interface CryptoAmountFormProps {
  asset: CryptoAsset;
  /** The signed-in user's actual wallet currency, set at signup from their country (never the display-only preference). */
  walletCurrency: string;
  /** The user's real held crypto_wallets balance for this symbol (get-crypto-wallet-balance.ts) - the actual ceiling on how much can be sold. */
  availableBalance: number;
}

interface SellCryptoResponse {
  payout: number;
  currency: string;
}

// Matches the crypto price API's own cache window (docs: CoinGecko data is
// server-cached and refreshed roughly once a minute), so polling faster
// than this just re-fetches the same cached figures.
const RATE_REFRESH_MS = 60_000;
const AMOUNT_DEBOUNCE_MS = 350;

/**
 * Sell Crypto (docs/product-rules.md rule 6a, REVISED AGAIN): a single
 * screen, not a submit-and-wait-for-admin flow. The crypto being sold is
 * already a verified, previously-deposited crypto_wallets balance
 * (legitimacy was established at deposit time), so this is an instant
 * internal conversion - pick a network, enter an amount up to the current
 * held balance, see the live payout preview, confirm, done. No deposit
 * address step, no proof-of-submission, no admin review.
 *
 * The payout is Veyro's actual quote, live CoinGecko price marked down by
 * the asset's margin and converted to the user's wallet currency (GET
 * /crypto/payout, docs/product-rules.md's payout formula), not a raw
 * market price - it polls every 60s so the preview stays close to the
 * live price/FX rate while the user is still deciding. The actual sale
 * (POST /trades/crypto/sell) recomputes this quote server-side rather than
 * trusting the client's last-polled figure, same reasoning as every other
 * quote-then-execute flow in this app. Below it, two reference cards
 * (currency FX rate, raw USD market price + chart) poll on the same
 * interval so the payout preview never looks out of sync with the numbers
 * next to it.
 */
export function CryptoAmountForm({
  asset,
  walletCurrency,
  availableBalance,
}: CryptoAmountFormProps) {
  const router = useRouter();
  const [networkId, setNetworkId] = useState(asset.networks[0].id);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [lastPayout, setLastPayout] = useState<SellCryptoResponse | null>(null);
  const debouncedAmount = useDebouncedValue(amount, AMOUNT_DEBOUNCE_MS);

  const network = networkById(asset, networkId);

  const parsedRawAmount = Number(amount);
  const rawAmountValid =
    amount.trim() !== "" &&
    Number.isFinite(parsedRawAmount) &&
    parsedRawAmount > 0;
  const exceedsBalance = rawAmountValid && parsedRawAmount > availableBalance;

  const parsedDebouncedAmount = Number(debouncedAmount);
  const debouncedAmountValid =
    debouncedAmount.trim() !== "" &&
    Number.isFinite(parsedDebouncedAmount) &&
    parsedDebouncedAmount > 0;

  const { quote, loading, refreshedAt } = useCryptoPayout(
    asset.symbol,
    network.assetNetwork,
    debouncedAmountValid ? parsedDebouncedAmount : 0,
    walletCurrency,
    RATE_REFRESH_MS,
  );

  // Needed for the two rate cards below (FX rate and the raw USD market
  // price + chart) even before an amount is entered, since useCryptoPayout
  // only fetches once amount > 0.
  const { rates: cryptoRates, loading: ratesLoading } =
    useCryptoRates(RATE_REFRESH_MS);
  const assetRate = cryptoRates?.[asset.symbol];

  // The FX rate card needs a live rate regardless of whether the user has
  // typed an amount yet, so it polls its own 1-unit quote independently of
  // the payout preview above.
  const { quote: fxQuote } = useCryptoPayout(
    asset.symbol,
    network.assetNetwork,
    1,
    walletCurrency,
    RATE_REFRESH_MS,
  );

  const canSubmit =
    rawAmountValid &&
    !exceedsBalance &&
    !loading &&
    quote !== null &&
    !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setSubmitting(true);
    try {
      const result = await authFetch<SellCryptoResponse>(
        "/trades/crypto/sell",
        {
          method: "POST",
          body: JSON.stringify({
            symbol: asset.symbol,
            network: network.assetNetwork,
            amount: parsedRawAmount,
          }),
        },
      );
      setLastPayout(result);
      setAmount("");
      setConfirmationOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmationClose(open: boolean) {
    setConfirmationOpen(open);
    if (!open) router.push("/assets");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Field label="Network">
        <NetworkField
          networks={asset.networks}
          value={networkId}
          onChange={setNetworkId}
        />
      </Field>

      <Field label={`Amount (${asset.symbol})`}>
        <div className="border-border bg-card focus-within:border-primary focus-within:ring-primary/30 flex items-center gap-2 rounded-xl border px-4 py-3 focus-within:ring-3">
          <input
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step="any"
            placeholder="0.00"
            className="text-ink placeholder:text-ink/35 w-full min-w-0 bg-transparent text-sm tabular-nums outline-none"
          />
          <span className="text-ink/40 shrink-0 text-sm">{asset.symbol}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink/45 text-xs">
            Available:{" "}
            {availableBalance.toLocaleString("en-US", {
              maximumFractionDigits: 8,
            })}{" "}
            {asset.symbol}
          </span>
          {exceedsBalance ? (
            <span className="text-error text-xs">
              More than your available balance.
            </span>
          ) : null}
        </div>
      </Field>

      <PayoutSummary
        payout={quote?.payout ?? 0}
        currency={walletCurrency}
        refreshedAt={refreshedAt}
      />

      <div className="grid grid-cols-2 gap-3">
        <FxRateCard currency={walletCurrency} fxRate={fxQuote?.fxRate} />
        <AssetPriceCard
          symbol={asset.symbol}
          priceUsd={assetRate?.priceUsd}
          history={assetRate?.history}
          positive={(assetRate?.change24h ?? 0) >= 0}
          loading={ratesLoading}
        />
      </div>

      {error ? <p className="text-error text-sm">{error}</p> : null}

      <Button type="submit" size="lg" disabled={!canSubmit} className="w-full">
        {submitting ? "Selling..." : "Sell Now"}
      </Button>

      <ConfirmationDialog
        open={confirmationOpen}
        onOpenChange={handleConfirmationClose}
        title="Sold"
        description={
          lastPayout
            ? `Your wallet has been credited ${formatPayout(lastPayout.payout, lastPayout.currency)}.`
            : "Your wallet has been credited."
        }
      />
    </form>
  );
}

function formatPayout(payout: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(payout);
  } catch {
    return `${currency} ${payout.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-ink text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function PayoutSummary({
  payout,
  currency,
  refreshedAt,
}: {
  payout: number;
  currency: string;
  refreshedAt: number | null;
}) {
  const display = useMemo(() => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
      }).format(payout);
    } catch {
      return `${currency} ${payout.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
    }
  }, [payout, currency]);

  const secondsLeft = useCountdown(refreshedAt, RATE_REFRESH_MS);
  const scrollRef = useAutoRevealScroll<HTMLDivElement>([display]);

  return (
    <div className="bg-secondary/50 rounded-2xl px-5 py-4">
      <p className="text-ink/50 text-xs font-medium tracking-wide uppercase">
        You&apos;ll receive
      </p>
      <div
        ref={scrollRef}
        className="no-scrollbar mt-1 overflow-x-auto overscroll-x-contain"
      >
        <p className="font-heading text-primary w-max text-3xl font-semibold whitespace-nowrap tabular-nums">
          {display}
        </p>
      </div>
      <p className="text-ink/45 mt-1.5 text-xs tabular-nums">
        Rate updates in {secondsLeft}s
      </p>
    </div>
  );
}

function formatFxRate(currency: string, rate: number | undefined): string {
  if (rate === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: rate < 1 ? 4 : 2,
    }).format(rate);
  } catch {
    return `${currency} ${rate.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}

function FxRateCard({
  currency,
  fxRate,
}: {
  currency: string;
  fxRate: number | undefined;
}) {
  return (
    <div className="bg-secondary/50 flex flex-col justify-between gap-2 rounded-2xl px-4 py-4">
      <p className="text-ink/50 text-xs font-medium tracking-wide uppercase">
        Currency Rate
      </p>
      {fxRate === undefined ? (
        <div className="h-7 w-20 animate-pulse rounded-md bg-black/5" />
      ) : (
        <p className="font-heading text-ink min-w-0 text-xl font-semibold tabular-nums">
          <span className="block">$1 =</span>
          <span className="block break-words">
            {formatFxRate(currency, fxRate)}
          </span>
        </p>
      )}
    </div>
  );
}

function AssetPriceCard({
  symbol,
  priceUsd,
  history,
  positive,
  loading,
}: {
  symbol: string;
  priceUsd: number | undefined;
  history: number[] | undefined;
  positive: boolean;
  loading: boolean;
}) {
  const hasPrice = !loading && priceUsd !== undefined;
  const { whole, decimals } = splitPriceUsd(priceUsd ?? 0);

  return (
    <div className="bg-secondary/50 flex flex-col gap-2 rounded-2xl px-4 py-4">
      <div className="min-w-0">
        <p className="text-ink/50 text-xs font-medium tracking-wide uppercase">
          {symbol} / USD
        </p>
        {hasPrice ? (
          <p className="font-heading text-ink mt-1 truncate text-xl font-semibold tabular-nums">
            <span>${whole}</span>
            <span className="text-ink/40 text-sm font-medium">.{decimals}</span>
          </p>
        ) : (
          <div className="mt-1 h-7 w-20 animate-pulse rounded-md bg-black/5" />
        )}
      </div>
      <div className="h-10 w-full">
        {hasPrice && history && history.length > 1 ? (
          <PriceSparkline
            history={history}
            positive={positive}
            className="h-full w-full"
          />
        ) : (
          <div className="h-full w-full rounded-lg bg-black/5" />
        )}
      </div>
    </div>
  );
}

/**
 * Seconds remaining until the next rate refresh, ticking down once a
 * second and snapping back to the full interval as soon as `refreshedAt`
 * moves (a new quote actually landed), rather than resetting on a fixed
 * clock that could drift from when the data really changed.
 */
function useCountdown(refreshedAt: number | null, intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (refreshedAt === null) return Math.round(intervalMs / 1000);
  const elapsed = now - refreshedAt;
  const remaining = Math.max(0, Math.ceil((intervalMs - elapsed) / 1000));
  return remaining;
}
