"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";
import { Button } from "@/components/ui/button";
import { useCryptoPayout } from "@/lib/crypto/use-crypto-payout";
import { useDisplayCurrency } from "@/lib/display-currency/context";
import { formatCryptoPayout } from "@/lib/display-currency/format";

interface CryptoRateRow {
  asset: string;
  detail: string;
  /** Matched against crypto_assets.symbol for the payout quote. */
  symbol: string;
  /**
   * Matched against crypto_assets.network for the payout quote - the exact
   * `assetNetwork` value from lib/crypto/data.ts, not the short display
   * label, since that's what the crypto_assets table actually stores.
   */
  network: string;
}

// Shows Veyro's actual sell payout quote (GET /crypto/payout: live price
// marked down by margin and converted to the display currency), the same
// figure the /crypto rate browser shows, so this section never falls out
// of sync with a second, hand-maintained number. Crypto only: gift card
// rates aren't live-sourced the same way (per docs/product-rules.md) and
// mixing the two here read as one flat "instant cash" rate, which doesn't
// hold for crypto's real hold-then-sell model.
const RATES: CryptoRateRow[] = [
  { asset: "Bitcoin", detail: "BTC", symbol: "BTC", network: "BTC" },
  {
    asset: "Ethereum",
    detail: "ERC20",
    symbol: "ETH",
    network: "Ethereum (ERC20)",
  },
  {
    asset: "USDT",
    detail: "TRC20",
    symbol: "USDT",
    network: "TRON (TRC20)",
  },
  {
    asset: "USD Coin",
    detail: "ERC20",
    symbol: "USDC",
    network: "Ethereum (ERC20)",
  },
];

export function RateShowcase() {
  const displayCurrency = useDisplayCurrency();

  // RATES has a fixed, known set of rows, so these are called directly
  // rather than inside the render loop below (hooks can't be called
  // conditionally or a variable number of times per render).
  const btcQuote = useCryptoPayout("BTC", "BTC", 1, displayCurrency);
  const ethQuote = useCryptoPayout(
    "ETH",
    "Ethereum (ERC20)",
    1,
    displayCurrency,
  );
  const usdtQuote = useCryptoPayout("USDT", "TRON (TRC20)", 1, displayCurrency);
  const usdcQuote = useCryptoPayout(
    "USDC",
    "Ethereum (ERC20)",
    1,
    displayCurrency,
  );
  const quotesBySymbol = {
    BTC: btcQuote,
    ETH: ethQuote,
    USDT: usdtQuote,
    USDC: usdcQuote,
  };

  return (
    <section className="bg-secondary/60 py-20 sm:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <ScrollReveal direction="up" className="h-full">
            <div className="bg-ink relative flex h-full flex-col justify-between overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-12">
              <OrbitRings
                className="text-background pointer-events-none absolute -top-24 -right-24 size-80 sm:size-96"
                stroke="currentColor"
                dot="currentColor"
              />
              <div className="relative">
                <span className="text-background/60 text-xs font-medium tracking-[0.2em] uppercase">
                  Crypto Platform Rates
                </span>
                <h2 className="font-heading text-background mt-3 max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  See what your crypto sells for
                </h2>
                <p className="text-background/65 mt-4 max-w-sm text-sm">
                  Live sell rates, only if and when you choose to sell. Deposits
                  are held as your own balance, not converted automatically.
                </p>
              </div>

              <ul className="relative mt-10 flex flex-col gap-0.5">
                {RATES.map((row, i) => {
                  const { quote, loading } =
                    quotesBySymbol[row.symbol as keyof typeof quotesBySymbol];

                  const rateDisplay = loading ? (
                    <span className="bg-background/10 inline-block h-4 w-20 animate-pulse rounded" />
                  ) : (
                    `${formatCryptoPayout(quote?.payout ?? 0, displayCurrency)} / ${row.symbol}`
                  );

                  return (
                    <li
                      key={row.asset}
                      className={
                        i !== RATES.length - 1
                          ? "border-background/10 flex items-center justify-between border-b py-3"
                          : "flex items-center justify-between py-3"
                      }
                    >
                      <div>
                        <p className="text-background text-sm font-medium">
                          {row.asset}
                        </p>
                        <p className="text-background/50 text-xs">
                          {row.detail}
                        </p>
                      </div>
                      <span className="font-heading text-primary tabular-nums">
                        {rateDisplay}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100} className="h-full">
            <div className="bg-background flex h-full flex-col justify-between rounded-3xl px-6 py-10 sm:px-8">
              <div>
                <span className="text-ink/50 text-xs font-medium tracking-[0.2em] uppercase">
                  Gift Cards & Crypto
                </span>
                <h3 className="font-heading text-ink mt-3 text-2xl font-medium text-balance">
                  Sell gift cards in minutes, hold crypto on your terms
                </h3>
                <p className="text-ink/60 mt-4 text-sm">
                  From Steam and Apple to USDT and Bitcoin, submit your assets.
                  Gift cards pay out straight to your wallet; crypto lands as a
                  real balance you sell or withdraw whenever you choose.
                </p>
              </div>
              <Button asChild className="mt-8 w-fit rounded-full">
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
