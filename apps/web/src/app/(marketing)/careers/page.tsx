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
import { getScoutProgramDetails } from "@/lib/scout/get-program-details";

export const metadata: Metadata = {
  alternates: { canonical: "/careers" },
  robots: { index: true, follow: true },
};

const SCOUT_APPLY_PATH = "/scout";

// Careers Part A: the public Scout listing. Apply routes straight to the
// in-app Scout page for an already-logged-in user (which shows the
// explainer + apply form, or the working dashboard if already approved),
// or through /login?next=/scout (which carries the destination through the
// whole login/signup/verify-email chain, see those pages) for anyone else.
export default async function CareersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const applyHref = user
    ? SCOUT_APPLY_PATH
    : `/login?next=${encodeURIComponent(SCOUT_APPLY_PATH)}`;

  // Fetched once here and passed down rather than each section re-fetching
  // the same GET /scout/program-details - see program-details.tsx,
  // how-it-works.tsx, hero.tsx, and faq.tsx for how the numbers are used.
  const programDetails = await getScoutProgramDetails();

  return (
    <>
      <Nav />
      <main>
        <CareersHero applyHref={applyHref} programDetails={programDetails} />
        <CareersProgramDetails programDetails={programDetails} />
        <CareersWhatScoutsDo />
        <CareersHowItWorks programDetails={programDetails} />
        <CareersFaq programDetails={programDetails} />
        <CareersFinalCta applyHref={applyHref} />
      </main>
      <Footer />
    </>
  );
}
