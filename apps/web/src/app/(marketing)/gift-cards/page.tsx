import type { Metadata } from "next";
import Link from "next/link";
import { GiftIcon } from "@heroicons/react/24/solid";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { OrbitRings } from "@/components/home/orbit-rings";

export const metadata: Metadata = {
  title: "Gift Cards - Coming Soon",
  alternates: { canonical: "/gift-cards" },
  robots: { index: true, follow: true },
};

// Gift card selling isn't integrated yet (locked platform-wide, same as
// the in-app Sell Gift Cards flow - see GiftCardLocked). This page used to
// run a full marketing funnel (hero pitch, live-looking rate browser,
// process walkthrough, FAQ, final CTA) for a feature that doesn't actually
// work yet, with only a small disclaimer at the very bottom - misleading.
// Replaced with a single honest "Coming Soon" notice and a redirect toward
// what's actually live (crypto), no schema.org Offer markup either since
// there's no real offer to publish (see gift-card-schema.ts).
export default function GiftCardsPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="bg-background relative overflow-hidden">
          <OrbitRings
            className="text-ink/40 pointer-events-none absolute top-0 right-0 size-[36rem] translate-x-1/4 -translate-y-1/4 sm:size-[44rem]"
            stroke="currentColor"
            dot="#E8674A"
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 0%, rgba(250,247,242,0) 0%, rgba(250,247,242,0.9) 78%, #FAF7F2 100%)",
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
            <span className="bg-primary/10 text-primary flex size-14 items-center justify-center rounded-full">
              <GiftIcon className="size-6" aria-hidden="true" />
            </span>
            <span className="bg-secondary text-ink/60 mt-6 rounded-full px-3 py-1 text-xs font-medium tracking-wide uppercase">
              Coming Soon
            </span>
            <h1 className="font-heading text-ink mt-5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Gift card sales aren&apos;t live yet
            </h1>
            <p className="text-ink/65 mt-4 max-w-md text-base text-pretty">
              We&apos;re still building out gift card support. In the meantime,
              Veyro is live for crypto: deposit into your own real balance and
              sell or withdraw whenever you want.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-7 text-base"
              >
                <Link href="/crypto">Trade Crypto</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full px-7 text-base"
              >
                <Link href="/signup">Create Account</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
