import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";
import { CareersApplyButton } from "./apply-button";

export function CareersHero({ applyHref }: { applyHref: string }) {
  return (
    <section className="bg-background relative overflow-hidden pb-14 sm:pb-16">
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

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-4 pt-16 text-center sm:px-6 sm:pt-20 lg:px-8 lg:pt-24">
        <ScrollReveal direction="up">
          <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
            Careers · Scout
          </span>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={80}>
          <h1 className="font-heading text-ink mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Get paid to talk about Veyro.
          </h1>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={160}>
          <p className="text-ink/65 mt-5 max-w-lg text-base text-pretty sm:text-lg">
            Bring people to Veyro, grow the Scout network, and talk up the
            platform wherever you&apos;re active - Reddit, X, anywhere. Earn
            $240 a day.
          </p>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={240}>
          <div className="mt-8">
            <CareersApplyButton applyHref={applyHref} size="lg" />
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
