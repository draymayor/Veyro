import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/home/hero";
import { CryptoCarousel } from "@/components/home/crypto-carousel";
import { HowItWorks } from "@/components/home/how-it-works";
import { RateShowcase } from "@/components/home/rate-showcase";
import { WhyVeyro } from "@/components/home/why-veyro";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // Safety net: a Google OAuth redirect lands here with an unconsumed
  // ?code= if the origin used for signInWithOAuth's redirectTo isn't in
  // Supabase's Auth > URL Configuration > Redirect URLs allowlist for this
  // project, Supabase then silently falls back to the project's Site URL
  // while still appending the authorization code, instead of erroring.
  // That leaves a user stranded on the marketing homepage with a session
  // that never got exchanged (auth/callback/route.ts never even runs).
  // Forwarding the code there instead of dropping it here means a future
  // allowlist gap fails safe rather than silently losing the session.
  const params = await searchParams;
  if (typeof params.code === "string") {
    const forwarded = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string") forwarded.set(key, value);
    }
    redirect(`/auth/callback?${forwarded.toString()}`);
  }

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
