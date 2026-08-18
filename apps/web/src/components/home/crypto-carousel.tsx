"use client";

import { CryptoPriceCard } from "@/components/crypto/crypto-price-card";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { CRYPTO_ASSETS } from "@/lib/crypto/data";
import { useCryptoRates } from "@/lib/crypto/use-crypto-rates";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

/**
 * Auto-scrolling marquee of the crypto assets Veyro accepts, replacing a
 * plain stats row with something visual. Falls back to a static wrapped
 * grid when the user prefers reduced motion.
 */
export function CryptoCarousel() {
  const reducedMotion = usePrefersReducedMotion();
  const { rates, loading, error } = useCryptoRates();
  const track = [...CRYPTO_ASSETS, ...CRYPTO_ASSETS];

  return (
    <section className="bg-primary relative overflow-hidden py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <ScrollReveal direction="up">
            <span className="text-primary-foreground/70 text-xs font-medium tracking-[0.2em] uppercase">
              Crypto
            </span>
            <h2 className="font-heading text-primary-foreground mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Sell crypto for cash, too
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={80}>
            <p className="text-primary-foreground/80 mt-4">
              Seven major assets and counting. Send from any wallet, get
              confirmed, get paid.
            </p>
          </ScrollReveal>
        </div>
      </div>

      <ScrollReveal direction="up" delay={120} className="mt-12">
        <div
          className={cn(
            "group relative",
            !reducedMotion &&
              "[mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]",
          )}
        >
          <div
            className={cn(
              "flex w-max gap-5 px-4 sm:px-6",
              !reducedMotion &&
                "animate-[marquee_28s_linear_infinite] group-hover:[animation-play-state:paused]",
            )}
            style={
              reducedMotion
                ? {
                    flexWrap: "wrap",
                    justifyContent: "center",
                    maxWidth: "72rem",
                    margin: "0 auto",
                  }
                : undefined
            }
          >
            {(reducedMotion ? CRYPTO_ASSETS : track).map((asset, i) => (
              <CryptoPriceCard
                key={`${asset.id}-${i}`}
                iconKey={asset.iconKey}
                name={asset.name}
                symbol={asset.symbol}
                rate={rates?.[asset.symbol]}
                loading={loading}
                error={error}
                className="w-60 shrink-0 sm:w-64"
              />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
