"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { OrbitRings } from "@/components/home/orbit-rings";
import { AssetIcon } from "@/components/crypto/asset-icon";
import { CRYPTO_ASSETS, formatUsd } from "@/lib/crypto/data";
import { useCryptoRates } from "@/lib/crypto/use-crypto-rates";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

const TICKER = [...CRYPTO_ASSETS, ...CRYPTO_ASSETS];

/**
 * Crypto hero. Shares the homepage/gift-cards hero's orbit-rings + radial
 * fade backdrop for visual continuity, but composes and times its entrance
 * differently: the headline splits into two lines that reveal on a GSAP
 * stagger (rather than the single fade-up block used elsewhere), a second
 * ring sits low-left in a slow continuous rotation instead of sitting
 * static, and a slim live-price ticker (distinct from the big homepage
 * coin carousel) runs beneath the subhead.
 */
export function CryptoHero() {
  const reducedMotion = usePrefersReducedMotion();
  const lineRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const subRef = useRef<HTMLParagraphElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  const { rates, loading, error } = useCryptoRates();

  useEffect(() => {
    if (reducedMotion) {
      gsap.set([...lineRefs.current, subRef.current, tickerRef.current], {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
      });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        lineRefs.current,
        { y: 34, opacity: 0, filter: "blur(10px)" },
        {
          y: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.85,
          stagger: 0.14,
        },
      )
        .fromTo(
          subRef.current,
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.4",
        )
        .fromTo(
          tickerRef.current,
          { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
          "-=0.3",
        );
    });

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <section className="bg-background relative overflow-hidden pb-14 sm:pb-16">
      <OrbitRings
        className="text-ink/40 pointer-events-none absolute top-0 right-0 size-[36rem] translate-x-1/4 -translate-y-1/4 sm:size-[44rem]"
        stroke="currentColor"
        dot="#E8674A"
      />
      <OrbitRings
        className={cn(
          "text-primary/50 pointer-events-none absolute top-1/3 left-0 size-64 -translate-x-1/3 sm:size-80",
          !reducedMotion && "animate-[spin_60s_linear_infinite]",
        )}
        stroke="currentColor"
        dot="#8A9B7E"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(250,247,242,0) 0%, rgba(250,247,242,0.9) 78%, #FAF7F2 100%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <h1 className="font-heading text-ink flex max-w-2xl flex-col text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          <span
            ref={(el) => {
              lineRefs.current[0] = el;
            }}
            className="inline-block"
          >
            Sell your crypto.
          </span>
          <span
            ref={(el) => {
              lineRefs.current[1] = el;
            }}
            className="inline-block"
          >
            Get paid the moment we confirm.
          </span>
        </h1>

        <p
          ref={subRef}
          className="text-ink/65 mt-5 max-w-lg text-base text-pretty sm:text-lg"
        >
          Pick your asset and network, see the rate, and send from any wallet.
        </p>
      </div>

      <div
        ref={tickerRef}
        className={cn(
          "border-border bg-card relative mt-10 w-full overflow-hidden border-y py-3",
          !reducedMotion &&
            "[mask-image:linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]",
        )}
      >
        <div
          className={cn(
            "flex w-max items-center gap-6 px-6",
            !reducedMotion &&
              "animate-[marquee_22s_linear_infinite] hover:[animation-play-state:paused]",
          )}
          style={
            reducedMotion
              ? { flexWrap: "wrap", justifyContent: "center", margin: "0 auto" }
              : undefined
          }
        >
          {(reducedMotion ? CRYPTO_ASSETS : TICKER).map((asset, i) => {
            const rate = rates?.[asset.symbol];
            return (
              <div
                key={`${asset.id}-${i}`}
                className="flex shrink-0 items-center gap-2 text-sm"
              >
                <AssetIcon iconKey={asset.iconKey} className="size-4" />
                <span className="text-ink/70 font-medium">{asset.symbol}</span>
                {loading && (
                  <span className="bg-ink/10 h-4 w-14 animate-pulse rounded" />
                )}
                {!loading && error && (
                  <span className="text-ink/30 text-xs">Unavailable</span>
                )}
                {!loading && !error && rate && (
                  <>
                    <span className="text-ink tabular-nums">
                      {formatUsd(rate.priceUsd)}
                    </span>
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        rate.change24h >= 0
                          ? "text-success"
                          : "text-destructive",
                      )}
                    >
                      {rate.change24h >= 0 ? "+" : ""}
                      {rate.change24h.toFixed(1)}%
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
