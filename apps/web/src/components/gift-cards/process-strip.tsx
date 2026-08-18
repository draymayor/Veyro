import { CreditCard, Gauge, UploadCloud, Wallet } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: CreditCard,
    title: "Pick your card",
    copy: "Choose the brand, country, and type you're selling.",
    orbit: true,
  },
  {
    icon: Gauge,
    title: "See your rate",
    copy: "Your payout is calculated instantly, before you submit anything.",
  },
  {
    icon: UploadCloud,
    title: "Submit your code or photos",
    copy: "Enter your code and PIN, or upload clear photos of a physical card.",
    orbit: true,
  },
  {
    icon: Wallet,
    title: "Get paid",
    copy: "Once verified, your wallet is credited automatically.",
  },
];

/**
 * Condensed, gift-card specific walkthrough. Uses the same bordered
 * snap-scroll card treatment as the homepage's How It Works section so the
 * two pages read as one design system, trimmed to four steps instead of
 * seven.
 */
export function ProcessStrip() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <ScrollReveal direction="up" className="max-w-xl">
        <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
          Process
        </span>
        <h2 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          From card to cash in four steps
        </h2>
      </ScrollReveal>

      <div className="mt-12 flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
        {STEPS.map((step, i) => (
          <ScrollReveal
            key={step.title}
            as="div"
            index={i}
            staggerStep={90}
            direction="up"
            distance={20}
            className="border-border bg-card relative w-[15.5rem] shrink-0 snap-start overflow-hidden rounded-2xl border p-6 shadow-[0_10px_30px_rgba(28,27,41,0.06)] sm:w-72"
          >
            {step.orbit && (
              <OrbitRings
                className={cn(
                  "text-primary pointer-events-none absolute -top-14 -right-14 size-40",
                  "opacity-[0.14]",
                )}
                stroke="#E8674A"
                dot="#E8674A"
              />
            )}
            <span className="bg-primary/10 font-heading text-primary relative flex size-10 items-center justify-center rounded-full text-sm font-semibold">
              <step.icon className="size-5" />
            </span>
            <span className="text-ink/40 relative mt-4 block text-xs font-medium">
              Step {i + 1}
            </span>
            <h3 className="font-heading text-ink relative mt-1 text-base font-medium">
              {step.title}
            </h3>
            <p className="text-ink/60 relative mt-2 text-sm">{step.copy}</p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
