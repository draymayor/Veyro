import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/home/hero";
import { CryptoCarousel } from "@/components/home/crypto-carousel";
import { HowItWorks } from "@/components/home/how-it-works";
import { RateShowcase } from "@/components/home/rate-showcase";
import { WhyVeyro } from "@/components/home/why-veyro";
import { FinalCta } from "@/components/home/final-cta";

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <CryptoCarousel />
        <HowItWorks />
        <RateShowcase />
        <WhyVeyro />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
