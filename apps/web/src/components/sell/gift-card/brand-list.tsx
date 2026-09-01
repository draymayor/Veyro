"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  MagnifyingGlassIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/solid";
import { ArrowUpRight } from "lucide-react";
import { BrandMark } from "@/components/gift-cards/brand-mark";
import {
  COUNTRIES,
  GIFT_CARD_BRANDS,
  brandCountrySummaries,
  type GiftCardBrand,
} from "@/lib/gift-cards/data";
import {
  formatWalletAmount,
  type WalletCurrency,
} from "@/lib/dashboard/wallet-currency";
import { useFxRates } from "@/lib/fx/use-fx-rates";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

interface GiftCardBrandListProps {
  /** The signed-in user's actual display currency, never the rate's stored currency. */
  homeCurrency: WalletCurrency;
}

/**
 * List + expand interaction for the sell flow's brand picker. Search bar
 * mirrors the public /gift-cards page's rounded pill language, but the
 * list itself follows docs/design-principles.md's List/Row Styling rule:
 * flat rows with no shadow, no border, and no dividing lines between them,
 * generous vertical padding instead of a boxed card to separate rows.
 */
export function GiftCardBrandList({ homeCurrency }: GiftCardBrandListProps) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const visibleBrands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GIFT_CARD_BRANDS;
    return GIFT_CARD_BRANDS.filter((brand) =>
      brand.name.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-6">
      <label className="border-border bg-card focus-within:ring-ring/40 flex h-11 items-center gap-2 rounded-full border px-4 transition-shadow focus-within:ring-3">
        <MagnifyingGlassIcon
          className="text-ink/35 size-4 shrink-0"
          aria-hidden="true"
        />
        <span className="sr-only">Search brands</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search brands..."
          className="text-ink placeholder:text-ink/35 w-full bg-transparent text-sm outline-none"
        />
      </label>

      {visibleBrands.length > 0 ? (
        <div className="flex flex-col">
          {visibleBrands.map((brand) => (
            <BrandRow
              key={brand.id}
              brand={brand}
              homeCurrency={homeCurrency}
              expanded={expandedId === brand.id}
              onToggle={() =>
                setExpandedId((current) =>
                  current === brand.id ? null : brand.id,
                )
              }
            />
          ))}
        </div>
      ) : (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No brands match your filters. Try clearing a filter or searching a
          different name.
        </p>
      )}
    </div>
  );
}

interface BrandRowProps {
  brand: GiftCardBrand;
  homeCurrency: WalletCurrency;
  expanded: boolean;
  onToggle: () => void;
}

function BrandRow({ brand, homeCurrency, expanded, onToggle }: BrandRowProps) {
  const reducedMotion = usePrefersReducedMotion();
  const summaries = useMemo(() => brandCountrySummaries(brand.id), [brand.id]);
  const { rates: fxRates } = useFxRates();

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="hover:bg-secondary/50 flex w-full items-center gap-4 rounded-2xl px-4 py-5 text-left transition-colors sm:px-5"
      >
        <BrandMark brand={brand} className="size-10 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="text-ink font-heading block text-sm font-medium sm:text-base">
            {brand.name}
          </span>
          <span className="text-ink/45 block text-xs">
            {summaries.length}{" "}
            {summaries.length === 1 ? "country" : "countries"} available
          </span>
        </span>
        <ChevronDownIcon
          className={cn(
            "text-ink/35 size-4 shrink-0 transition-transform duration-300",
            expanded && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={reducedMotion ? undefined : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col pb-2">
              {summaries.map((summary) => {
                const countryMeta = COUNTRIES[summary.country];
                return (
                  <Link
                    key={summary.country}
                    href={`/sell/gift-card/${brand.id}/${summary.country}`}
                    className="hover:bg-secondary/50 flex items-center justify-between gap-4 rounded-2xl px-4 py-4 pl-[4.25rem] transition-colors sm:px-5 sm:pl-[4.75rem]"
                  >
                    <span className="min-w-0">
                      <span className="text-ink flex items-center gap-1.5 text-sm font-medium">
                        {countryMeta.flag && (
                          <span aria-hidden="true">{countryMeta.flag}</span>
                        )}
                        {countryMeta.label}
                      </span>
                      <span className="text-ink/45 block text-xs tabular-nums">
                        ${summary.minDenomination} &ndash; $
                        {summary.maxDenomination}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-primary text-sm font-semibold tabular-nums">
                        Up to{" "}
                        {formatWalletAmount(
                          summary.bestRate,
                          "NGN",
                          homeCurrency,
                          fxRates ?? undefined,
                        )}
                      </span>
                      <ArrowUpRight
                        className="text-ink/30 size-4"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
