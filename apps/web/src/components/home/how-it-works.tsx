import {
  UserPlus,
  Gift,
  Gauge,
  UploadCloud,
  ShieldCheck,
  Wallet,
  Banknote,
} from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: UserPlus,
    title: "Create your account",
    copy: "Sign up and pick your country to set your wallet currency.",
    orbit: true,
  },
  {
    icon: Gift,
    title: "Select your gift card or crypto",
    copy: "Choose the brand, denomination, or crypto asset you're selling.",
  },
  {
    icon: Gauge,
    title: "See your rate instantly",
    copy: "Your payout is calculated up front, before you submit anything.",
  },
  {
    icon: UploadCloud,
    title: "Submit your card or send your crypto",
    copy: "Enter your card code and photos, or send crypto to our address.",
    orbit: true,
  },
  {
    icon: ShieldCheck,
    title: "We confirm",
    copy: "Our team verifies your submission, usually within minutes.",
  },
  {
    icon: Wallet,
    title: "Your wallet is credited",
    copy: "Once approved, funds land in your Veyro wallet automatically.",
  },
  {
    icon: Banknote,
    title: "Withdraw your money",
    copy: "Cash out by bank transfer, PayPal, or crypto, whenever you're ready.",
    orbit: true,
  },
];

export function HowItWorks() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <ScrollReveal direction="up">
            <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
              Process
            </span>
            <h2 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              How It Works
            </h2>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={80}>
            <p className="text-ink/60 mt-4">
              Seven steps from submission to payout, no surprises in between.
            </p>
          </ScrollReveal>
        </div>
      </div>

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
