import type { ReactNode } from "react";
import { LegalHeader } from "@/components/legal/header";
import { LegalToc, LegalMobileToc, type TocItem } from "@/components/legal/toc";

/**
 * Shared shell for restrained, reading-first legal pages (Terms, Privacy).
 * Header, mobile jump row, and sticky desktop TOC are identical across
 * these pages by design, so they read as siblings; only the section
 * content passed as children differs per page.
 */
export function LegalPageShell({
  eyebrow,
  title,
  intro,
  tocItems,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  tocItems: TocItem[];
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-24 sm:px-6 sm:pt-16 lg:px-8 lg:pb-32">
      <LegalHeader eyebrow={eyebrow} title={title} intro={intro} />

      <LegalMobileToc items={tocItems} />

      <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-[200px_1fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <LegalToc items={tocItems} />
        </div>
        <div className="max-w-2xl">{children}</div>
      </div>
    </div>
  );
}
