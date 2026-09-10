"use client";

import { Accordion } from "radix-ui";
import { Plus } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { JsonLd } from "@/components/seo/json-ld";

const FAQS = [
  {
    question: "What exactly do I have to do?",
    answer:
      "Drive real signups who claim the Earn bonus, recruit new Scouts, and generally advocate for Veyro - commenting, engaging, and posting wherever you're active. A referral link is useful but not mandatory on every single post. There's no separate job for each type of activity, it's one role and it pays the same either way.",
  },
  {
    question: "How much does it pay?",
    answer:
      "$240 for each paid day. A day closes once you've submitted at least 10 links, and it gets credited once we review and approve it.",
  },
  {
    question: "When can I withdraw my Scout earnings?",
    answer:
      "Once you've completed 30 approved paid days. Your regular Veyro balance, from trades, referrals, or anything else, is never affected by this and stays withdrawable as normal.",
  },
  {
    question: "How long does a day take?",
    answer:
      "A day isn't time-based, it stays open across as many calendar days as you need until you submit 10 links, then it closes for our review.",
  },
  {
    question: "How many days can I have waiting for review at once?",
    answer:
      "Up to 5. Once you have 5 completed days awaiting review, you'll need to wait for us to review at least one before starting a new one.",
  },
  {
    question: "What if a day or a link gets rejected?",
    answer:
      "We review every link individually before deciding on the day. A rejected day doesn't count toward your 30-day total, and doesn't pay out, but it also doesn't undo any day you've already had approved.",
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export function CareersFaq() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <JsonLd data={FAQ_SCHEMA} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <ScrollReveal
          direction="up"
          className="lg:sticky lg:top-28 lg:self-start"
        >
          <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
            FAQ
          </span>
          <h2 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Scout questions
          </h2>
          <p className="text-ink/60 mt-4 max-w-sm">
            Everything you need to know before you apply.
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
                <Accordion.Content className="text-ink/60 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm motion-reduce:!animate-none">
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
