import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";

export function CareersFinalCta({ applyHref }: { applyHref: string }) {
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
                Ready to start earning as a Scout?
              </h2>
              <p className="text-primary-foreground/85 mt-4">
                Apply in a couple of minutes. We&apos;ll review it and let you
                know either way.
              </p>
            </div>
            <div className="shrink-0">
              <CareersApplyButtonInverted applyHref={applyHref} />
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}

// A dedicated inverted variant (background/ink swapped for the primary
// banner) rather than reusing CareersApplyButton's default styling, same
// approach as the crypto/gift-cards final CTA's own Get Started button.
function CareersApplyButtonInverted({ applyHref }: { applyHref: string }) {
  return (
    <a
      href={applyHref}
      className="bg-background text-ink hover:bg-background/90 inline-flex h-12 items-center justify-center rounded-full px-7 text-base font-medium shadow-sm transition-colors"
    >
      Apply to be a Scout
    </a>
  );
}
