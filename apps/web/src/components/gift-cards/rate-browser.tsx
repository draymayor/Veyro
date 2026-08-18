"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { BrandCard } from "@/components/gift-cards/brand-card";
import { PillFilter } from "@/components/gift-cards/filter-pills";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import {
  COUNTRIES,
  GIFT_CARD_BRANDS,
  countryOptions,
  ratesForBrand,
  type CardType,
  type GiftCardBrand,
} from "@/lib/gift-cards/data";

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "physical", label: "Physical" },
  { value: "e-code", label: "E-code" },
];

interface VisibleBrand {
  id: string;
  brand: GiftCardBrand;
  rate: number;
  country: string;
  countryCount: number;
  cardType: CardType;
}

/**
 * The functional core of the gift cards page. Filtering and search reflow
 * the grid with a GSAP Flip transition rather than an instant swap, so
 * cards animate to their new positions instead of just disappearing and
 * reappearing. The pill filters (see filter-pills.tsx) borrow the layout
 * idea of a chip row above a grid, reworked with a measured sliding
 * highlight instead of a static toggle state.
 */
export function RateBrowser() {
  const reducedMotion = usePrefersReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const flipState = useRef<Flip.FlipState | null>(null);

  const [country, setCountry] = useState("all");
  const [cardType, setCardType] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    gsap.registerPlugin(Flip);
  }, []);

  const countryChips = useMemo(
    () => [
      { value: "all", label: "All" },
      ...countryOptions().map((code) => ({
        value: code,
        label: COUNTRIES[code].label,
      })),
    ],
    [],
  );

  const visibleBrands = useMemo<VisibleBrand[]>(() => {
    const q = query.trim().toLowerCase();
    const result: VisibleBrand[] = [];

    for (const brand of GIFT_CARD_BRANDS) {
      if (q && !brand.name.toLowerCase().includes(q)) continue;

      const countryMatches = ratesForBrand(brand.id).filter(
        (rate) => country === "all" || rate.country === country,
      );
      if (!countryMatches.length) continue;

      // When no type filter is active, lead with the brand's default card
      // type so brands that offer both keep a consistent representative
      // type on the grid, falling back to whatever type is available for
      // the selected country if the default type has no match there.
      let typeMatches: typeof countryMatches;
      if (cardType !== "all") {
        typeMatches = countryMatches.filter(
          (rate) => rate.cardType === cardType,
        );
      } else {
        const defaultTypeMatches = countryMatches.filter(
          (rate) => rate.cardType === brand.defaultType,
        );
        typeMatches = defaultTypeMatches.length
          ? defaultTypeMatches
          : countryMatches;
      }
      if (!typeMatches.length) continue;

      const best = typeMatches.reduce((a, b) => (b.rate > a.rate ? b : a));
      const countries = new Set(typeMatches.map((m) => m.country));

      result.push({
        id: brand.id,
        brand,
        rate: best.rate,
        country: best.country,
        countryCount: countries.size,
        cardType: best.cardType,
      });
    }

    return result;
  }, [country, cardType, query]);

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
  }, [visibleBrands]);

  return (
    <section className="bg-primary relative overflow-hidden py-20 sm:py-28">
      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <ScrollReveal direction="up">
            <span className="text-primary-foreground/70 text-xs font-medium tracking-[0.2em] uppercase">
              Gift Card Rates
            </span>
            <h2 className="font-heading text-primary-foreground mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Find your brand, see your rate
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={80}>
            <p className="text-primary-foreground/80 mt-4">
              Filter by country or card type, or search for your brand directly.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal direction="up" delay={120} className="mt-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap gap-6">
              <PillFilter
                label="Country"
                options={countryChips}
                value={country}
                collapseOnMobile
                onChange={(next) => {
                  captureFlip();
                  setCountry(next);
                }}
              />
              <PillFilter
                label="Type"
                options={TYPE_OPTIONS}
                value={cardType}
                onChange={(next) => {
                  captureFlip();
                  setCardType(next);
                }}
              />
            </div>

            <label className="border-background/20 bg-background focus-within:border-background/50 relative flex h-11 w-full items-center gap-2 rounded-full border px-4 lg:w-64">
              <Search
                className="text-ink/35 size-4 shrink-0"
                aria-hidden="true"
              />
              <span className="sr-only">Search brands</span>
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  captureFlip();
                  setQuery(e.target.value);
                }}
                placeholder="Search brands..."
                className="placeholder:text-ink/35 text-ink w-full bg-transparent text-sm outline-none"
              />
            </label>
          </div>
        </ScrollReveal>

        <div
          ref={gridRef}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visibleBrands.map((item) => (
            <BrandCard
              key={item.id}
              brand={item.brand}
              rate={item.rate}
              country={item.country}
              countryCount={item.countryCount}
              cardType={item.cardType}
            />
          ))}
        </div>

        {visibleBrands.length === 0 && (
          <p className="text-primary-foreground/70 mt-10 text-center text-sm">
            No brands match your filters. Try clearing a filter or searching a
            different name.
          </p>
        )}

        <p className="text-primary-foreground/60 mt-8 text-center text-xs">
          Platform Rates shown are subject to confirmation at submission time.
        </p>
      </div>
    </section>
  );
}
