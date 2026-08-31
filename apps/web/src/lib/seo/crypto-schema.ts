import { CRYPTO_ASSETS } from "@/lib/crypto/data";
import { getApiBaseUrl } from "@/lib/api-base-url";
import { SITE_URL } from "@/lib/seo/public-pages";

// USD is Veyro's general primary wallet currency, not NGN, so the
// structured data's price currency matches that rather than assuming
// every visitor is Nigerian.
const SCHEMA_CURRENCY = "USD";

interface PayoutResponse {
  payout: number;
}

async function fetchPayout(
  symbol: string,
  network: string,
): Promise<number | null> {
  try {
    const search = new URLSearchParams({
      symbol,
      network,
      amount: "1",
      currency: SCHEMA_CURRENCY,
    });
    const res = await fetch(
      `${getApiBaseUrl()}/crypto/payout?${search.toString()}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as PayoutResponse;
    return data.payout;
  } catch {
    return null;
  }
}

/**
 * Veyro buys crypto from visitors, it does not sell it, so each Offer uses
 * GoodRelations' gr:Buy business function instead of the implicit default
 * of gr:Sell. Prices are Veyro's actual payout quote, live CoinGecko price
 * marked down by the asset's margin and converted to USD (GET
 * /crypto/payout, docs/product-rules.md's payout formula), not the raw
 * market price, fetched server-side for this page so the numbers here
 * match what the rate browser grid actually renders, not a separately
 * hardcoded figure. An asset/network with no quote available (feed or FX
 * briefly unavailable) is left out of the structured data entirely rather
 * than publishing a stale or invented number.
 */
export async function cryptoOffersSchema() {
  const assets = await Promise.all(
    CRYPTO_ASSETS.map(async (asset) => {
      const offers = (
        await Promise.all(
          asset.networks.map(async (network) => {
            const payout = await fetchPayout(asset.symbol, network.label);
            if (payout === null) return null;

            return {
              "@type": "Offer",
              businessFunction: "http://purl.org/goodrelations/v1#Buy",
              price: payout,
              priceCurrency: SCHEMA_CURRENCY,
              description: `Veyro's buy rate for ${asset.symbol} on ${network.fullName}. Rates fluctuate with the live market price and are subject to confirmation at submission time.`,
              url: `${SITE_URL}/crypto`,
            };
          }),
        )
      ).filter((offer): offer is NonNullable<typeof offer> => offer !== null);

      if (offers.length === 0) return null;

      return {
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${asset.name} (${asset.symbol})`,
        description: `Sell your ${asset.name} to Veyro for an instant cash payout to your wallet.`,
        offers,
      };
    }),
  );

  return assets.filter(
    (schema): schema is NonNullable<typeof schema> => schema !== null,
  );
}
