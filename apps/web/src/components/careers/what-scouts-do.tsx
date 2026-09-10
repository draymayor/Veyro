import { Megaphone, UserPlus, MessageCircle } from "lucide-react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

const RESPONSIBILITIES = [
  {
    icon: Megaphone,
    title: "Bring in new users",
    copy: "Point people to Veyro and get them to claim the Earn bonus. A completed signup and claimed bonus counts for more than a click, so make it count.",
  },
  {
    icon: UserPlus,
    title: "Bring in new Scouts",
    copy: "Know someone active on social who'd be good at this? Refer them into the Scout program itself.",
  },
  {
    icon: MessageCircle,
    title: "Talk about Veyro, not just link to it",
    copy: "Comment under popular posts, engage in groups and communities, and generally advocate for the platform. A referral link isn't required on every single post, real engagement counts too.",
  },
];

// Sits between the pay/requirements section and the sequential How It Works
// steps, so it's read before the process, not folded into step 3 - the
// whole reason this section exists is that "post a referral link" was
// being read as the entire job when it's really the narrowest part of it.
export function CareersWhatScoutsDo() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <ScrollReveal direction="up" className="max-w-xl">
        <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase">
          Requirements
        </span>
        <h2 className="font-heading text-ink mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          What Scouts actually do
        </h2>
        <p className="text-ink/60 mt-4">
          It&apos;s broader than dropping a link. Scouts drive real signups,
          refer new Scouts, and keep the conversation about Veyro going wherever
          they&apos;re active.
        </p>
      </ScrollReveal>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {RESPONSIBILITIES.map((item, i) => (
          <ScrollReveal
            key={item.title}
            index={i}
            staggerStep={80}
            direction="up"
            className="border-border bg-card rounded-2xl border p-6"
          >
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
              <item.icon className="size-5" />
            </span>
            <h3 className="font-heading text-ink mt-4 text-base font-medium">
              {item.title}
            </h3>
            <p className="text-ink/60 mt-2 text-sm">{item.copy}</p>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
