import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { GiftCardsHero } from "@/components/gift-cards/hero";
import { RateBrowser } from "@/components/gift-cards/rate-browser";
import { ProcessStrip } from "@/components/gift-cards/process-strip";
import { GiftCardFaq } from "@/components/gift-cards/faq";
import { GiftCardsFinalCta } from "@/components/gift-cards/final-cta";
import { giftCardOffersSchema } from "@/lib/seo/gift-card-schema";
import { JsonLd } from "@/components/seo/json-ld";

export const metadata: Metadata = {
  alternates: { canonical: "/gift-cards" },
  robots: { index: true, follow: true },
};

export default function GiftCardsPage() {
  return (
    <>
      <Nav />
      <main>
        <GiftCardsHero />
        <RateBrowser />
        <ProcessStrip />
        <GiftCardFaq />
        <GiftCardsFinalCta />
        {giftCardOffersSchema().map((schema) => (
          <JsonLd key={schema.name} data={schema} />
        ))}
      </main>
      <Footer />
    </>
  );
}
