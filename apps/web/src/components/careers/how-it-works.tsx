import {
  FileText,
  BadgeCheck,
  Share2,
  ClipboardCheck,
  Wallet,
} from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: FileText,
    title: "Apply",
    copy: "Tell us your platforms, handles, and posting style. Takes a couple of minutes.",
    orbit: true,
  },
  {
    icon: BadgeCheck,
    title: "Get approved",
    copy: "We review your application and let you know either way.",
  },
  {
    icon: Share2,
    title: "Get active",
    copy: "Post, comment, and engage wherever you're active - Reddit, X, anywhere. Bring in new users who claim the Earn bonus, refer new Scouts, or just talk up Veyro. A referral link helps but isn't required on every post.",
    orbit: true,
  },
  {
    icon: ClipboardCheck,
    title: "Submit 10 links",
    copy: "Submit at least 10 links a day. Once you hit 10, that day closes for review.",
  },
  {
    icon: Wallet,
    title: "Get paid",
    copy: "We review your links, approve the day, and credit $240 to your wallet.",
  },
];

export function CareersHowItWorks() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <ScrollReveal direction="up" className="max-w-xl">
        <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
          Process
        </span>
        <h2 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          How Scout works
        </h2>
      </ScrollReveal>

      <div className="mt-12 flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden">
        {STEPS.map((step, i) => (
          <ScrollReveal
            key={step.title}
            as="div"
            index={i}
            staggerStep={80}
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
