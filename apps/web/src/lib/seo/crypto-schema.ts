import { CRYPTO_ASSETS, payoutFor } from "@/lib/crypto/data";
import type { CryptoRatesMap } from "@/lib/crypto/use-crypto-rates";
import { SITE_URL } from "@/lib/seo/public-pages";

/**
 * Veyro buys crypto from visitors, it does not sell it, so each Offer uses
 * GoodRelations' gr:Buy business function instead of the implicit default
 * of gr:Sell. Prices come from the same live rates GET /crypto/rates
 * returns to the client (see use-crypto-rates.ts), fetched server-side for
 * this page so the numbers here match what the rate browser grid actually
 * renders, not a separately hardcoded figure. An asset with no live price
 * (feed briefly unavailable) is left out of the structured data entirely
 * rather than publishing a stale or invented number.
 */
export function cryptoOffersSchema(rates: CryptoRatesMap | null) {
  if (!rates) return [];

  return CRYPTO_ASSETS.map((asset) => {
    const liveRate = rates[asset.symbol];
    if (!liveRate) return null;

    return {
      "@context": "https://schema.org",
      "@type": "Product",
      name: `${asset.name} (${asset.symbol})`,
      description: `Sell your ${asset.name} to Veyro for an instant cash payout to your wallet.`,
      offers: asset.networks.map((network) => ({
        "@type": "Offer",
        businessFunction: "http://purl.org/goodrelations/v1#Buy",
        price: payoutFor(liveRate.priceUsd, network),
        priceCurrency: "NGN",
        description: `Veyro's buy rate for ${asset.symbol} on ${network.fullName}. Rates fluctuate with the live market price and are subject to confirmation at submission time.`,
        url: `${SITE_URL}/crypto`,
      })),
    };
  }).filter((schema): schema is NonNullable<typeof schema> => schema !== null);
}
