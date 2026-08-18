"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TocItem {
  id: string;
  label: string;
}

/**
 * Scrollspy table of contents for the reading column beside it. Observes
 * each section heading directly rather than the ScrollReveal wrappers, so
 * the active link updates as soon as a section reaches the read zone near
 * the top of the viewport, independent of the fade-in timing.
 */
export function LegalToc({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Table of contents" className="hidden lg:block">
      <p className="text-ink/40 text-xs font-medium tracking-[0.2em] uppercase">
        On this page
      </p>
      <ul className="border-border mt-4 space-y-1 border-l">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "-ml-px block border-l-2 py-1.5 pl-4 text-sm transition-colors",
                activeId === item.id
                  ? "border-primary text-primary font-medium"
                  : "text-ink/55 hover:text-ink border-transparent",
              )}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Compact horizontal jump-link row for narrow viewports, where a sticky
 * sidebar has nowhere to live. Not sticky and no scrollspy, just a fast
 * way to skip ahead without scrolling through every section.
 */
export function LegalMobileToc({ items }: { items: TocItem[] }) {
  return (
    <nav
      aria-label="Table of contents"
      className="border-border -mx-4 flex gap-2 overflow-x-auto border-y px-4 py-3 lg:hidden"
    >
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className="border-border bg-card text-ink/70 hover:text-ink shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
