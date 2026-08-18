"use client";

import { Accordion } from "radix-ui";
import { Plus } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

const FAQS = [
  {
    question: "Which gift card brands do you accept?",
    answer:
      "We accept Amazon, Steam, Apple, Google Play, PlayStation, Xbox, Razer Gold, Sephora, Walmart, and more. Search or filter above to see current rates for your brand.",
  },
  {
    question: "What's the difference between physical and e-code cards?",
    answer:
      "A physical card has a code printed on the back or under a scratch panel. An e-code is delivered by email or receipt only, with no physical card attached. Both are accepted, and rates can differ between the two.",
  },
  {
    question: "How long does verification take?",
    answer:
      "Most submissions are reviewed within minutes. Some cards take longer if we need to confirm the balance with the issuer.",
  },
  {
    question: "What happens if my card is rejected?",
    answer:
      "You'll see the reason directly on your submission. Common reasons include an incorrect code, a card that's already been used, or a balance we can't verify.",
  },
  {
    question: "When do I get paid?",
    answer:
      "The moment your submission is approved, the payout is added to your Veyro wallet automatically. From there you can withdraw by bank transfer, PayPal, or crypto.",
  },
  {
    question: "Are these rates guaranteed?",
    answer:
      "Rates shown are Platform Rates and can change. The rate is locked in the moment you submit, so what you see is what you get once verification is complete.",
  },
];

export function GiftCardFaq() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <ScrollReveal direction="up" className="lg:sticky lg:top-28 lg:self-start">
          <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
            FAQ
          </span>
          <h2 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Gift card questions
          </h2>
          <p className="text-ink/60 mt-4 max-w-sm">
            Everything you need to know before you submit your first card.
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
