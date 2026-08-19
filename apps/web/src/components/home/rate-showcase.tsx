"use client";

import Link from "next/link";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";
import { Button } from "@/components/ui/button";
import { CRYPTO_ASSETS, payoutFor } from "@/lib/crypto/data";
import { useCryptoRates } from "@/lib/crypto/use-crypto-rates";
import { useDisplayCurrency } from "@/lib/display-currency/context";
import { formatDisplayAmount } from "@/lib/display-currency/format";

interface GiftCardRateRow {
  kind: "gift-card";
  asset: string;
  detail: string;
  /** Platform Rate, NGN per $1 of card value. */
  rateNgn: number;
}

interface CryptoRateRow {
  kind: "crypto";
  asset: string;
  detail: string;
  /** Looked up in CRYPTO_ASSETS for the live price and Platform Rate multiplier. */
  assetId: string;
  networkId: string;
}

type RateRow = GiftCardRateRow | CryptoRateRow;

// Gift card rows are manually set Platform Rates (no live source exists for
// them, per docs/product-rules.md). Crypto rows use the same live price +
// Platform Rate combination shown on the /crypto rate browser, so this
// section never falls out of sync with a second, hand-maintained number.
const RATES: RateRow[] = [
  {
    kind: "gift-card",
    asset: "Steam",
    detail: "USA, e-code",
    rateNgn: 1050,
  },
  {
    kind: "gift-card",
    asset: "Apple",
    detail: "USA, physical",
    rateNgn: 1120,
  },
  {
    kind: "gift-card",
    asset: "Google Play",
    detail: "USA, e-code",
    rateNgn: 1000,
  },
  {
    kind: "crypto",
    asset: "USDT",
    detail: "TRC20",
    assetId: "usdt",
    networkId: "trc20",
  },
  {
    kind: "crypto",
    asset: "Bitcoin",
    detail: "BTC",
    assetId: "btc",
    networkId: "bitcoin",
  },
];

export function RateShowcase() {
  const { rates, loading, error } = useCryptoRates();
  const displayCurrency = useDisplayCurrency();
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
                  Platform Rates
                </span>
                <h2 className="font-heading text-background mt-3 max-w-md text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  See what your assets are worth
                </h2>
                <p className="text-background/65 mt-4 max-w-sm text-sm">
                  A sample of today&apos;s rates. Rates fluctuate and are
                  subject to confirmation at submission time.
                </p>
              </div>

              <ul className="relative mt-10 flex flex-col gap-0.5">
                {RATES.map((row, i) => {
                  let rateDisplay: React.ReactNode = null;
                  if (row.kind === "gift-card") {
                    rateDisplay = `${formatDisplayAmount(row.rateNgn, displayCurrency)} / $1`;
                  } else {
                    const cryptoAsset = CRYPTO_ASSETS.find(
                      (a) => a.id === row.assetId,
                    );
                    const network = cryptoAsset?.networks.find(
                      (n) => n.id === row.networkId,
                    );
                    const liveRate = cryptoAsset
                      ? rates?.[cryptoAsset.symbol]
                      : undefined;

                    if (loading) {
                      rateDisplay = (
                        <span className="bg-background/10 inline-block h-4 w-20 animate-pulse rounded" />
                      );
                    } else if (error || !liveRate || !network) {
                      rateDisplay = (
                        <span className="text-background/40 text-sm font-normal">
                          Rate unavailable
                        </span>
                      );
                    } else {
                      rateDisplay = `${formatDisplayAmount(payoutFor(liveRate.priceUsd, network), displayCurrency)} / ${cryptoAsset!.symbol}`;
                    }
                  }

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
                  Sell gift cards and crypto in minutes
                </h3>
                <p className="text-ink/60 mt-4 text-sm">
                  From Steam and Apple to USDT and Bitcoin, submit your assets
                  and get paid straight to your Veyro wallet.
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
