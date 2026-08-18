import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { CryptoHero } from "@/components/crypto/hero";
import { RateBrowser } from "@/components/crypto/rate-browser";
import { CryptoHowItWorks } from "@/components/crypto/how-it-works";
import { CryptoFaq } from "@/components/crypto/faq";
import { CryptoFinalCta } from "@/components/crypto/final-cta";

export default function CryptoPage() {
  return (
    <>
      <Nav />
      <main>
        <CryptoHero />
        <RateBrowser />
        <CryptoHowItWorks />
        <CryptoFaq />
        <CryptoFinalCta />
      </main>
      <Footer />
    </>
  );
}
