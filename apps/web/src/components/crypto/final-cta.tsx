import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";

/**
 * Same terracotta banner shape as the gift cards page's final CTA (a
 * left-aligned split with the button beside the copy on desktop).
 */
export function CryptoFinalCta() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <ScrollReveal direction="up" scale>
        <div className="bg-primary relative overflow-hidden rounded-3xl px-6 py-14 sm:px-12 sm:py-16">
          <OrbitRings
            className="text-background pointer-events-none absolute top-1/2 right-0 size-[34rem] translate-x-1/3 -translate-y-1/2"
            stroke="currentColor"
            dot="currentColor"
          />
          <div className="relative flex flex-col items-start gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-md">
              <h2 className="font-heading text-primary-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Ready to sell your crypto?
              </h2>
              <p className="text-primary-foreground/85 mt-4">
                Pick your asset above, see your rate, and get paid the
                moment we confirm your deposit.
              </p>
            </div>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-background text-ink hover:bg-background/90 h-12 shrink-0 rounded-full px-7 text-base"
            >
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
