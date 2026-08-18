import { Zap, Globe2, ShieldCheck, Eye } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";
import { cn } from "@/lib/utils";

const VALUE_PROPS = [
  {
    icon: Zap,
    title: "Instant payout",
    copy: "Once your card or crypto is confirmed, your wallet is credited automatically. No waiting around.",
    tone: "primary" as const,
  },
  {
    icon: Globe2,
    title: "Wide brand & crypto support",
    copy: "Dozens of gift card brands and seven major crypto assets, all in one place, all one flow.",
    tone: "card" as const,
  },
  {
    icon: Eye,
    title: "Transparent rates",
    copy: "See exactly what you'll receive before you submit anything. No hidden markdowns.",
    tone: "card" as const,
  },
  {
    icon: ShieldCheck,
    title: "Secure verification",
    copy: "Every submission is reviewed by our team before your wallet is credited, keeping trades safe.",
    tone: "card" as const,
  },
];

export function WhyVeyro() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <ScrollReveal direction="up">
          <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
            Why Veyro
          </span>
          <h2 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Built for trust, from the first trade
          </h2>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={80}>
          <p className="text-ink/60 mt-4">
            Built to make selling gift cards and crypto feel effortless.
          </p>
        </ScrollReveal>
      </div>

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE_PROPS.map((item, i) => (
          <ScrollReveal
            key={item.title}
            index={i}
            direction="up"
            scale
            className={cn(
              "relative overflow-hidden rounded-2xl p-6",
              item.tone === "primary"
                ? "bg-primary text-primary-foreground lg:col-span-2"
                : "bg-card border-border border",
            )}
          >
            {item.tone === "primary" && (
              <OrbitRings
                className="text-background pointer-events-none absolute -top-16 -right-16 size-56"
                stroke="currentColor"
                dot="currentColor"
              />
            )}
            <span
              className={cn(
                "relative flex size-10 items-center justify-center rounded-full",
                item.tone === "primary"
                  ? "bg-background/15"
                  : "bg-primary/10 text-primary",
              )}
            >
              <item.icon className="size-5" />
            </span>
            <h3
              className={cn(
                "font-heading relative mt-4 text-base font-medium",
                item.tone === "primary"
                  ? "text-primary-foreground"
                  : "text-ink",
              )}
            >
              {item.title}
            </h3>
            <p
              className={cn(
                "relative mt-2 text-sm",
                item.tone === "primary"
                  ? "text-primary-foreground/80"
                  : "text-ink/60",
              )}
            >
              {item.copy}
            </p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
