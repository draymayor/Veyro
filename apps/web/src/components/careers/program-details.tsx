import { Banknote, Link2, CalendarCheck } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import type { ScoutProgramDetails } from "@/lib/scout/types";

/**
 * Live program facts, fetched once by CareersPage (GET
 * /scout/program-details) and passed down here rather than each careers
 * section independently re-fetching the same settings. Used to hardcode
 * "10 links to close a day" directly in a static DETAILS array, which
 * silently went stale the moment an admin changed scout_min_links_per_day
 * without anyone touching this file. A missing/failed fetch (programDetails
 * null) omits the affected detail card entirely rather than falling back to
 * a guessed number.
 */
export function CareersProgramDetails({
  programDetails,
}: {
  programDetails: ScoutProgramDetails | null;
}) {
  const cards = [
    programDetails
      ? {
          icon: Banknote,
          title: `$${programDetails.dailyRateUsd} per paid day`,
          copy: "Credited straight to your Veyro wallet as Scout Program income, alongside your regular balance.",
        }
      : null,
    programDetails
      ? {
          icon: Link2,
          title: `${programDetails.minLinksPerDay} links to close a day`,
          copy: `Submit at least ${programDetails.minLinksPerDay} posts or comments recruiting Scouts or Veyro users to close out a paid day.`,
        }
      : null,
    programDetails
      ? {
          icon: CalendarCheck,
          title: `${programDetails.requiredPaidDays} paid days to withdraw`,
          copy: `Scout earnings become withdrawable once you've completed ${programDetails.requiredPaidDays} approved paid days. Your regular balance is never affected.`,
        }
      : null,
  ].filter((card): card is NonNullable<typeof card> => card !== null);

  if (cards.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="grid gap-6 sm:grid-cols-3">
        {cards.map((detail, i) => (
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
