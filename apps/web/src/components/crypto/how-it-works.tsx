import {
  ListChecks,
  Gauge,
  QrCode,
  Send,
  FileImage,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { OrbitRings } from "@/components/home/orbit-rings";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    icon: ListChecks,
    title: "Select your asset and network",
    copy: "Choose the crypto you're selling, then the network it's on.",
    orbit: true,
  },
  {
    icon: Gauge,
    title: "See your rate",
    copy: "Your payout per unit is calculated instantly, before you send anything.",
  },
  {
    icon: QrCode,
    title: "We show you our deposit address",
    copy: "A deposit address for that exact asset and network is generated for your submission.",
    orbit: true,
  },
  {
    icon: Send,
    title: "You send your crypto",
    copy: "Send from any wallet or exchange to the address we gave you.",
  },
  {
    icon: FileImage,
    title: "Submit your proof of deposit",
    copy: "Paste your transaction hash and upload a screenshot of the send.",
    orbit: true,
  },
  {
    icon: ShieldCheck,
    title: "We confirm on-chain",
    copy: "Our team verifies the deposit against the network, usually within minutes.",
  },
  {
    icon: WalletCards,
    title: "Your wallet is credited",
    copy: "Once confirmed, your payout lands in your Veyro wallet automatically.",
  },
];

/**
 * Crypto-specific walkthrough, same horizontal snap-scroll card treatment
 * as the homepage's How It Works and the gift cards Process Strip, so the
 * three read as one system, trimmed/expanded to this flow's own seven steps
 * (deposit address + proof of deposit) rather than a card code submission.
 */
export function CryptoHowItWorks() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <ScrollReveal direction="up" className="max-w-xl">
        <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
          Process
        </span>
        <h2 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          How crypto selling works on Veyro
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
