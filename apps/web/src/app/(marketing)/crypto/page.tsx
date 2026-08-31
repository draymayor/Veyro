import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { CryptoHero } from "@/components/crypto/hero";
import { RateBrowser } from "@/components/crypto/rate-browser";
import { CryptoHowItWorks } from "@/components/crypto/how-it-works";
import { CryptoFaq } from "@/components/crypto/faq";
import { CryptoFinalCta } from "@/components/crypto/final-cta";
import { cryptoOffersSchema } from "@/lib/seo/crypto-schema";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  alternates: { canonical: "/crypto" },
  robots: { index: true, follow: true },
};

export default async function CryptoPage() {
  const offersSchema = await cryptoOffersSchema();

  return (
    <>
      <Nav />
      <main>
        <CryptoHero />
        <RateBrowser />
        <CryptoHowItWorks />
        <CryptoFaq />
        <CryptoFinalCta />
        {offersSchema.map((schema) => (
          <JsonLd key={schema.name} data={schema} />
        ))}
      </main>
      <Footer />
    </>
  );
}
