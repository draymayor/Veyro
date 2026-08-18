import type { ReactNode } from "react";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

/**
 * Reading-column section for legal pages. Motion is intentionally minimal
 * (short duration, small distance, no stagger or scale) so it never
 * competes with reading the way the marketing pages' entrances do. The
 * anchor id lives on a plain wrapper, not the ScrollReveal element, since
 * ScrollReveal doesn't forward arbitrary props.
 */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="border-border scroll-mt-28 border-t py-9 first:border-t-0 first:pt-0 sm:py-10"
    >
      <ScrollReveal direction="up" distance={10} duration={450}>
        <h2 className="font-heading text-ink text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        <div className="text-ink/70 mt-4 space-y-4 text-[15px] leading-relaxed sm:text-base">
          {children}
        </div>
      </ScrollReveal>
    </div>
  );
}
