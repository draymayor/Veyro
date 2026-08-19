import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { CryptoHero } from "@/components/crypto/hero";
import { RateBrowser } from "@/components/crypto/rate-browser";
import { CryptoHowItWorks } from "@/components/crypto/how-it-works";
import { CryptoFaq } from "@/components/crypto/faq";
import { CryptoFinalCta } from "@/components/crypto/final-cta";
import { getApiBaseUrl } from "@/lib/api-base-url";
import type { CryptoRatesMap } from "@/lib/crypto/use-crypto-rates";
import { cryptoOffersSchema } from "@/lib/seo/crypto-schema";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  alternates: { canonical: "/crypto" },
  robots: { index: true, follow: true },
};

async function fetchRatesForSchema(): Promise<CryptoRatesMap | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/crypto/rates`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as CryptoRatesMap;
  } catch {
    return null;
  }
}

export default async function CryptoPage() {
  const rates = await fetchRatesForSchema();

  return (
    <>
      <Nav />
      <main>
        <CryptoHero />
        <RateBrowser />
        <CryptoHowItWorks />
        <CryptoFaq />
        <CryptoFinalCta />
        {cryptoOffersSchema(rates).map((schema) => (
          <JsonLd key={schema.name} data={schema} />
        ))}
      </main>
      <Footer />
    </>
  );
}
