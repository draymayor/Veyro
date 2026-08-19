import {
  GIFT_CARD_BRANDS,
  defaultBrandRate,
  type GiftCardBrand,
} from "@/lib/gift-cards/data";
import { SITE_URL } from "@/lib/seo/public-pages";

/**
 * Veyro buys gift cards from visitors, it does not sell them, so each Offer
 * uses GoodRelations' gr:Buy business function (the standard schema.org
 * mechanism for buyback/trade-in offers) instead of the implicit default of
 * gr:Sell. Values come from defaultBrandRate, the same selection the rate
 * browser grid uses on first load, so this can never show a rate that
 * isn't actually on the page.
 */
export function giftCardOffersSchema() {
  return GIFT_CARD_BRANDS.map((brand) => {
    const defaultRate = defaultBrandRate(brand);
    if (!defaultRate) return null;
    return buildGiftCardProductSchema(brand, defaultRate.rate);
  }).filter((schema): schema is NonNullable<typeof schema> => schema !== null);
}

function buildGiftCardProductSchema(brand: GiftCardBrand, rate: number) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${brand.name} Gift Card`,
    description: `Sell your ${brand.name} gift card to Veyro for an instant cash payout to your wallet.`,
    offers: {
      "@type": "Offer",
      businessFunction: "http://purl.org/goodrelations/v1#Buy",
      price: rate,
      priceCurrency: "NGN",
      description: `Veyro's Platform Rate: ${rate} NGN per $1 of ${brand.name} gift card value. Rates fluctuate and are subject to confirmation at submission time.`,
      url: `${SITE_URL}/gift-cards`,
    },
  };
}
