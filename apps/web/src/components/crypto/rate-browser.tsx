"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { AssetCard } from "@/components/crypto/asset-card";
import { CRYPTO_ASSETS } from "@/lib/crypto/data";
import { useCryptoRates } from "@/lib/crypto/use-crypto-rates";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";

/**
 * The functional core of the crypto page. Same full-bleed terracotta
 * treatment as the gift cards Rate Browser, but with a single search field
 * instead of country/type pill filters, since network choice already lives
 * inside each card rather than as a page-level filter. Search reflow reuses
 * the same GSAP Flip technique as gift cards for a consistent "cards animate
 * to position" feel across the site.
 */
export function RateBrowser() {
  const reducedMotion = usePrefersReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);
  const [query, setQuery] = useState("");
  const { rates, loading, error } = useCryptoRates();

  useEffect(() => {
    gsap.registerPlugin(Flip);
  }, []);

  const visibleAssets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CRYPTO_ASSETS;
    return CRYPTO_ASSETS.filter(
      (asset) =>
        asset.name.toLowerCase().includes(q) ||
        asset.symbol.toLowerCase().includes(q),
    );
  }, [query]);

  function captureFlip() {
    if (reducedMotion || !gridRef.current) return;
    flipState.current = Flip.getState(gridRef.current.children);
  }

  useLayoutEffect(() => {
    if (!flipState.current || !gridRef.current) return;
    Flip.from(flipState.current, {
      duration: 0.5,
      ease: "power3.out",
      stagger: 0.02,
      absolute: true,
      onEnter: (els) =>
        gsap.fromTo(
          els,
          { opacity: 0, scale: 0.92, filter: "blur(6px)" },
          {
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.45,
            stagger: 0.03,
            ease: "power2.out",
          },
        ),
      onLeave: (els) =>
        gsap.to(els, { opacity: 0, duration: 0.2, ease: "power1.out" }),
    });
    flipState.current = null;
  }, [visibleAssets]);

  return (
    <section className="bg-primary relative overflow-hidden py-20 sm:py-28">
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <ScrollReveal direction="up">
              <span className="text-primary-foreground/70 text-xs font-medium tracking-[0.2em] uppercase">
                Crypto Rates
              </span>
              <h2 className="font-heading text-primary-foreground mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Pick your asset, see your rate
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={80}>
              <p className="text-primary-foreground/80 mt-4">
                Search for an asset below. Where more than one network is
                supported, switch between them to see how the rate changes.
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal direction="up" delay={120}>
            <label className="border-background/20 bg-background focus-within:border-background/50 relative flex h-11 w-full items-center gap-2 rounded-full border px-4 sm:w-72">
              <Search
                className="text-ink/35 size-4 shrink-0"
                aria-hidden="true"
              />
              <span className="sr-only">Search assets</span>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  captureFlip();
                  setQuery(e.target.value);
                }}
                placeholder="Search assets..."
                className="placeholder:text-ink/35 text-ink w-full bg-transparent text-sm outline-none"
              />
            </label>
          </ScrollReveal>
        </div>

        <div
          ref={gridRef}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visibleAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              rate={rates?.[asset.symbol]}
              loading={loading}
              error={error}
            />
          ))}
        </div>

        {visibleAssets.length === 0 && (
          <p className="text-primary-foreground/70 mt-10 text-center text-sm">
            No assets match &ldquo;{query}&rdquo;. Try a different symbol or
            name.
          </p>
        )}

        <p className="text-primary-foreground/60 mt-8 text-center text-xs">
          Platform Rates shown are subject to confirmation at submission time.
        </p>
      </div>
    </section>
  );
}
