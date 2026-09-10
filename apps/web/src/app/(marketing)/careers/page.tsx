import type { Metadata } from "next";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { createClient } from "@/lib/supabase/server";
import { CareersHero } from "@/components/careers/hero";
import { CareersProgramDetails } from "@/components/careers/program-details";
import { CareersWhatScoutsDo } from "@/components/careers/what-scouts-do";
import { CareersHowItWorks } from "@/components/careers/how-it-works";
import { CareersFaq } from "@/components/careers/faq";
import { CareersFinalCta } from "@/components/careers/final-cta";

export const metadata: Metadata = {
  alternates: { canonical: "/careers" },
  robots: { index: true, follow: true },
};

const SCOUT_APPLY_PATH = "/scout/apply";

// Careers Part A: the public Scout listing. Apply routes straight to the
// application form for an already-logged-in user, or through
// /login?next=/scout/apply (which carries the destination through the
// whole login/signup/verify-email chain, see those pages) for anyone else.
export default async function CareersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const applyHref = user
    ? SCOUT_APPLY_PATH
    : `/login?next=${encodeURIComponent(SCOUT_APPLY_PATH)}`;

  return (
    <>
      <Nav />
      <main>
        <CareersHero applyHref={applyHref} />
        <CareersProgramDetails />
        <CareersWhatScoutsDo />
        <CareersHowItWorks />
        <CareersFaq />
        <CareersFinalCta applyHref={applyHref} />
      </main>
      <Footer />
    </>
  );
}
