"use client";

import { Tabs } from "radix-ui";
import { RateList } from "@/components/dashboard/rate-list";
import { CryptoRateRow } from "@/components/dashboard/crypto-rate-row";
import { GiftCardRateRow } from "@/components/dashboard/gift-card-rate-row";
import { SearchBar } from "@/components/app/search-bar";
import { CRYPTO_ASSETS } from "@/lib/crypto/data";
import { GIFT_CARD_BRANDS } from "@/lib/gift-cards/data";
import { useCryptoRates } from "@/lib/crypto/use-crypto-rates";
import { useSearchQuery } from "@/hooks/use-search-query";
import type { WalletCurrency } from "@/lib/dashboard/wallet-currency";

const TAB_TRIGGER =
  "text-ink/50 data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-sm rounded-full px-4 py-1.5 text-sm font-medium transition-colors";

interface RatesSectionProps {
  /** The signed-in user's actual display currency, for the Gift Cards rate tab. */
  homeCurrency: WalletCurrency;
}

export function RatesSection({ homeCurrency }: RatesSectionProps) {
  const { rates, loading, error } = useCryptoRates();
  const [query, setQuery] = useSearchQuery();

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCrypto = normalizedQuery
    ? CRYPTO_ASSETS.filter(
        (asset) =>
          asset.name.toLowerCase().includes(normalizedQuery) ||
          asset.symbol.toLowerCase().includes(normalizedQuery),
      )
    : CRYPTO_ASSETS;
  const filteredGiftCards = normalizedQuery
    ? GIFT_CARD_BRANDS.filter((brand) =>
        brand.name.toLowerCase().includes(normalizedQuery),
      )
    : GIFT_CARD_BRANDS;

  return (
    <section>
      <Tabs.Root defaultValue="crypto">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Tabs.List className="bg-secondary/70 inline-flex gap-1 rounded-full p-1">
            <Tabs.Trigger value="crypto" className={TAB_TRIGGER}>
              Crypto
            </Tabs.Trigger>
            <Tabs.Trigger value="gift-cards" className={TAB_TRIGGER}>
              Gift Cards
            </Tabs.Trigger>
          </Tabs.List>
          <SearchBar
            className="hidden max-w-56 md:flex"
            value={query}
            onChange={setQuery}
          />
        </div>

        <Tabs.Content value="crypto">
          {filteredCrypto.length > 0 ? (
            <RateList columns={["Asset", "Price", "24h"]}>
              {filteredCrypto.map((asset) => (
                <CryptoRateRow
                  key={asset.id}
                  asset={asset}
                  rate={rates?.[asset.symbol]}
                  loading={loading}
                  error={error}
                />
              ))}
            </RateList>
          ) : (
            <NoResults query={query} />
          )}
        </Tabs.Content>

        <Tabs.Content value="gift-cards">
          {filteredGiftCards.length > 0 ? (
            <RateList columns={["Brand", "Rate", "Country"]}>
              {filteredGiftCards.map((brand) => (
                <GiftCardRateRow
                  key={brand.id}
                  brand={brand}
                  homeCurrency={homeCurrency}
                />
              ))}
            </RateList>
          ) : (
            <NoResults query={query} />
          )}
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}

function NoResults({ query }: { query: string }) {
  return (
    <div className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-8 text-center text-sm">
      No matches for &ldquo;{query}&rdquo;.
    </div>
  );
}
