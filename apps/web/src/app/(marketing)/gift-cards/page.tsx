import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { GiftCardsHero } from "@/components/gift-cards/hero";
import { RateBrowser } from "@/components/gift-cards/rate-browser";
import { ProcessStrip } from "@/components/gift-cards/process-strip";
import { GiftCardFaq } from "@/components/gift-cards/faq";
import { GiftCardsFinalCta } from "@/components/gift-cards/final-cta";

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
      </main>
      <Footer />
    </>
  );
}
