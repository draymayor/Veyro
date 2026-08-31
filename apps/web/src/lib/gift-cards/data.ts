/**
 * Placeholder gift card catalog and rate data for the public /gift-cards
 * page. Shaped to mirror docs/database-schema.md's gift_card_brands and
 * gift_card_rates tables (brand, country, card type, denomination range,
 * rate) so this can be swapped for a real Supabase query later without
 * reshaping the UI. Rates are illustrative Platform Rates, not live data.
 */

export type CardType = "physical" | "e-code";

export interface GiftCardBrand {
  id: string;
  name: string;
  /** Path under /public/logos, when a real icon-only brand mark is available. */
  logo?: string;
  /** Which card type this brand's card leads with when no type filter is active. */
  defaultType: CardType;
  /** Fallback monogram badge used when no logo asset exists yet. */
  monogram: {
    letter: string;
    bg: string;
    fg: string;
  };
}

export interface GiftCardRate {
  brandId: string;
  country: string;
  cardType: CardType;
  minDenomination: number;
  maxDenomination: number;
  rate: number;
  currency: "NGN";
}

export const COUNTRIES: Record<string, { label: string; flag: string }> = {
  US: { label: "United States", flag: "\u{1F1FA}\u{1F1F8}" },
  GB: { label: "United Kingdom", flag: "\u{1F1EC}\u{1F1E7}" },
  CA: { label: "Canada", flag: "\u{1F1E8}\u{1F1E6}" },
  DE: { label: "Germany", flag: "\u{1F1E9}\u{1F1EA}" },
  Global: { label: "Global", flag: "" },
};

export const GIFT_CARD_BRANDS: GiftCardBrand[] = [
  {
    id: "amazon",
    name: "Amazon",
    logo: "/logos/amazon.svg",
    defaultType: "e-code",
    monogram: { letter: "a", bg: "#131921", fg: "#FF9900" },
  },
  {
    id: "steam",
    name: "Steam",
    logo: "/logos/steam.svg",
    defaultType: "e-code",
    monogram: { letter: "S", bg: "#1b2838", fg: "#66c0f4" },
  },
  {
    id: "apple",
    name: "Apple",
    logo: "/logos/apple.svg",
    defaultType: "physical",
    monogram: { letter: "A", bg: "#1c1c1e", fg: "#FAF7F2" },
  },
  {
    id: "google-play",
    name: "Google Play",
    logo: "/logos/googleplay.svg",
    defaultType: "e-code",
    monogram: { letter: "G", bg: "#F0EAE1", fg: "#1C1B29" },
  },
  {
    id: "playstation",
    name: "PlayStation",
    logo: "/logos/playstation.svg",
    defaultType: "physical",
    monogram: { letter: "P", bg: "#00308F", fg: "#FAF7F2" },
  },
  {
    id: "xbox",
    name: "Xbox",
    logo: "/logos/xbox.svg",
    defaultType: "e-code",
    monogram: { letter: "X", bg: "#107c10", fg: "#FAF7F2" },
  },
  {
    id: "razer-gold",
    name: "Razer Gold",
    logo: "/logos/razer.svg",
    defaultType: "e-code",
    monogram: { letter: "R", bg: "#0a0a0a", fg: "#44D62C" },
  },
  {
    id: "sephora",
    name: "Sephora",
    defaultType: "physical",
    monogram: { letter: "S", bg: "#0a0a0a", fg: "#FAF7F2" },
  },
  {
    id: "walmart",
    name: "Walmart",
    logo: "/logos/walmart.svg",
    defaultType: "physical",
    monogram: { letter: "W", bg: "#0071CE", fg: "#FFC220" },
  },
];

export const GIFT_CARD_RATES: GiftCardRate[] = [
  {
    brandId: "amazon",
    country: "US",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 500,
    rate: 1080,
    currency: "NGN",
  },
  {
    brandId: "amazon",
    country: "US",
    cardType: "physical",
    minDenomination: 25,
    maxDenomination: 200,
    rate: 1020,
    currency: "NGN",
  },
  {
    brandId: "amazon",
    country: "GB",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 500,
    rate: 1060,
    currency: "NGN",
  },
  {
    brandId: "amazon",
    country: "CA",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 300,
    rate: 1010,
    currency: "NGN",
  },
  {
    brandId: "amazon",
    country: "DE",
    cardType: "e-code",
    minDenomination: 15,
    maxDenomination: 300,
    rate: 990,
    currency: "NGN",
  },

  {
    brandId: "steam",
    country: "US",
    cardType: "e-code",
    minDenomination: 5,
    maxDenomination: 100,
    rate: 1050,
    currency: "NGN",
  },
  {
    brandId: "steam",
    country: "US",
    cardType: "physical",
    minDenomination: 10,
    maxDenomination: 100,
    rate: 1000,
    currency: "NGN",
  },
  {
    brandId: "steam",
    country: "GB",
    cardType: "e-code",
    minDenomination: 5,
    maxDenomination: 100,
    rate: 1030,
    currency: "NGN",
  },

  {
    brandId: "apple",
    country: "US",
    cardType: "physical",
    minDenomination: 25,
    maxDenomination: 500,
    rate: 1120,
    currency: "NGN",
  },
  {
    brandId: "apple",
    country: "US",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 500,
    rate: 1140,
    currency: "NGN",
  },
  {
    brandId: "apple",
    country: "CA",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 300,
    rate: 1080,
    currency: "NGN",
  },

  {
    brandId: "google-play",
    country: "US",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 200,
    rate: 1000,
    currency: "NGN",
  },
  {
    brandId: "google-play",
    country: "US",
    cardType: "physical",
    minDenomination: 15,
    maxDenomination: 200,
    rate: 950,
    currency: "NGN",
  },
  {
    brandId: "google-play",
    country: "GB",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 200,
    rate: 970,
    currency: "NGN",
  },

  {
    brandId: "playstation",
    country: "US",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 100,
    rate: 1030,
    currency: "NGN",
  },
  {
    brandId: "playstation",
    country: "US",
    cardType: "physical",
    minDenomination: 20,
    maxDenomination: 100,
    rate: 990,
    currency: "NGN",
  },
  {
    brandId: "playstation",
    country: "GB",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 100,
    rate: 1010,
    currency: "NGN",
  },
  {
    brandId: "playstation",
    country: "CA",
    cardType: "physical",
    minDenomination: 25,
    maxDenomination: 100,
    rate: 960,
    currency: "NGN",
  },

  {
    brandId: "xbox",
    country: "US",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 100,
    rate: 1015,
    currency: "NGN",
  },
  {
    brandId: "xbox",
    country: "US",
    cardType: "physical",
    minDenomination: 15,
    maxDenomination: 100,
    rate: 965,
    currency: "NGN",
  },
  {
    brandId: "xbox",
    country: "GB",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 100,
    rate: 985,
    currency: "NGN",
  },

  {
    brandId: "razer-gold",
    country: "Global",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 200,
    rate: 930,
    currency: "NGN",
  },
  {
    brandId: "razer-gold",
    country: "US",
    cardType: "e-code",
    minDenomination: 10,
    maxDenomination: 200,
    rate: 950,
    currency: "NGN",
  },

  {
    brandId: "sephora",
    country: "US",
    cardType: "physical",
    minDenomination: 25,
    maxDenomination: 250,
    rate: 900,
    currency: "NGN",
  },

  {
    brandId: "walmart",
    country: "US",
    cardType: "physical",
    minDenomination: 25,
    maxDenomination: 300,
    rate: 970,
    currency: "NGN",
  },
  {
    brandId: "walmart",
    country: "US",
    cardType: "e-code",
    minDenomination: 25,
    maxDenomination: 300,
    rate: 990,
    currency: "NGN",
  },
];

export function ratesForBrand(brandId: string): GiftCardRate[] {
  return GIFT_CARD_RATES.filter((rate) => rate.brandId === brandId);
}

export interface DefaultBrandRate {
  rate: number;
  country: string;
  cardType: CardType;
  countryCount: number;
}

/**
 * The rate a brand's card shows on first load, before any country or card
 * type filter is applied. Mirrors RateBrowser's unfiltered selection (leads
 * with the brand's default card type, falls back to whatever is available,
 * picks the highest rate among matches) so structured data built from this
 * never drifts from what the rate browser grid actually renders by default.
 */
export function defaultBrandRate(
  brand: GiftCardBrand,
): DefaultBrandRate | null {
  const countryMatches = ratesForBrand(brand.id);
  if (!countryMatches.length) return null;

  const defaultTypeMatches = countryMatches.filter(
    (rate) => rate.cardType === brand.defaultType,
  );
  const typeMatches = defaultTypeMatches.length
    ? defaultTypeMatches
    : countryMatches;

  const best = typeMatches.reduce((a, b) => (b.rate > a.rate ? b : a));
  const countries = new Set(typeMatches.map((m) => m.country));

  return {
    rate: best.rate,
    country: best.country,
    cardType: best.cardType,
    countryCount: countries.size,
  };
}

export function countryOptions(): string[] {
  const seen = new Set<string>();
  for (const rate of GIFT_CARD_RATES) seen.add(rate.country);
  return Array.from(seen).sort((a, b) => {
    if (a === "Global") return 1;
    if (b === "Global") return -1;
    return COUNTRIES[a].label.localeCompare(COUNTRIES[b].label);
  });
}

export interface BrandCountrySummary {
  country: string;
  rates: GiftCardRate[];
  bestRate: number;
  minDenomination: number;
  maxDenomination: number;
}

/**
 * Groups a brand's rates by country for the sell flow's list page. A brand
 * row expands into one line per country (not per physical/e-code row,
 * that split happens on the details page via tabs) since country is the
 * next dimension down from brand in gift_card_rates' brand -> country ->
 * type -> denomination shape.
 */
export function brandCountrySummaries(brandId: string): BrandCountrySummary[] {
  const byCountry = new Map<string, GiftCardRate[]>();
  for (const rate of ratesForBrand(brandId)) {
    const existing = byCountry.get(rate.country);
    if (existing) existing.push(rate);
    else byCountry.set(rate.country, [rate]);
  }

  return Array.from(byCountry.entries())
    .map(([country, rates]) => ({
      country,
      rates,
      bestRate: Math.max(...rates.map((r) => r.rate)),
      minDenomination: Math.min(...rates.map((r) => r.minDenomination)),
      maxDenomination: Math.max(...rates.map((r) => r.maxDenomination)),
    }))
    .sort((a, b) => {
      if (a.country === "Global") return 1;
      if (b.country === "Global") return -1;
      return COUNTRIES[a.country].label.localeCompare(
        COUNTRIES[b.country].label,
      );
    });
}

export function ratesForBrandCountry(
  brandId: string,
  country: string,
): GiftCardRate[] {
  return GIFT_CARD_RATES.filter(
    (rate) => rate.brandId === brandId && rate.country === country,
  );
}
