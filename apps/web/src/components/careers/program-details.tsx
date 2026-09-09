import { Banknote, Link2, CalendarCheck } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

const DETAILS = [
  {
    icon: Banknote,
    title: "$240 per paid day",
    copy: "Credited straight to your Veyro wallet as Scout Program income, alongside your regular balance.",
  },
  {
    icon: Link2,
    title: "10 links to close a day",
    copy: "Submit at least 10 posts or comments recruiting Scouts or Veyro users to close out a paid day.",
  },
  {
    icon: CalendarCheck,
    title: "30 paid days to withdraw",
    copy: "Scout earnings become withdrawable once you've completed 30 approved paid days. Your regular balance is never affected.",
  },
];

export function CareersProgramDetails() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="grid gap-6 sm:grid-cols-3">
        {DETAILS.map((detail, i) => (
          <ScrollReveal
            key={detail.title}
            index={i}
            staggerStep={80}
            direction="up"
            className="border-border bg-card rounded-2xl border p-6"
          >
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <detail.icon className="size-5" />
            </span>
            <h3 className="font-heading text-ink mt-4 text-base font-medium">
              {detail.title}
            </h3>
            <p className="text-ink/60 mt-2 text-sm">{detail.copy}</p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
