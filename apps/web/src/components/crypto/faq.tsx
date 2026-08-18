"use client";

import { Accordion } from "radix-ui";
import { Plus } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

const FAQS = [
  {
    question: "Which crypto assets and networks do you support?",
    answer:
      "We accept Bitcoin, Ethereum, Tether (USDT), BNB, Solana, XRP, and Dogecoin. Where an asset supports more than one network, like USDT on TRC20 or ERC20, you'll choose the exact network above before you see your deposit address.",
  },
  {
    question: "How long does confirmation take?",
    answer:
      "Once your deposit reaches our address and you've submitted your transaction hash and screenshot, most confirmations happen within minutes. Busier networks can take longer to reach enough confirmations.",
  },
  {
    question: "What happens if I send on the wrong network?",
    answer:
      "Sending on a network we don't support for that asset, or a network that doesn't match the address type, can mean those funds are lost permanently. Always match the network shown on the page to the network you're sending from.",
  },
  {
    question: "Is there a minimum amount I can sell?",
    answer:
      "Yes, minimums vary by asset and are shown at the point of submission so you always know before you send anything.",
  },
  {
    question: "When do I get paid after my deposit is confirmed?",
    answer:
      "The moment we confirm your deposit on-chain, the payout is added to your Veyro wallet automatically. From there you can withdraw by bank transfer, PayPal, or crypto.",
  },
  {
    question: "Are these rates guaranteed?",
    answer:
      "Rates shown are Platform Rates and can change. The rate is locked in the moment you submit, so what you see is what you get once your deposit is confirmed.",
  },
];

/**
 * Two-column split (heading beside accordion) instead of the gift cards
 * FAQ's centered single column, so the two FAQ sections don't read as the
 * same block reused with different questions.
 */
export function CryptoFaq() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <ScrollReveal direction="up" className="lg:sticky lg:top-28 lg:self-start">
          <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
            FAQ
          </span>
          <h2 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Crypto questions
          </h2>
          <p className="text-ink/60 mt-4 max-w-sm">
            Everything you need to know before you send your first deposit.
          </p>
        </ScrollReveal>

        <ScrollReveal direction="up" delay={100}>
          <Accordion.Root type="single" collapsible className="flex flex-col">
            {FAQS.map((item, i) => (
              <Accordion.Item
                key={item.question}
                value={`item-${i}`}
                className="border-border/70 border-b first:border-t"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="group text-ink flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-medium sm:text-base">
                    {item.question}
                    <Plus className="text-ink/40 size-4 shrink-0 transition-transform duration-300 group-data-[state=open]:rotate-45" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="motion-reduce:!animate-none text-ink/60 overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <p className="pb-5">{item.answer}</p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </ScrollReveal>
      </div>
    </section>
  );
}
