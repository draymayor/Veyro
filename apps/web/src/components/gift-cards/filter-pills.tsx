"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/motion/use-reduced-motion";
import { cn } from "@/lib/utils";

interface PillOption {
  value: string;
  label: string;
}

interface PillFilterProps {
  label: string;
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  /** Swap to a native select below sm, for filters with many options. */
  collapseOnMobile?: boolean;
}

/**
 * Pill/chip filter group with a sliding ink-colored highlight behind the
 * active option, measured from the actual button positions rather than a
 * fixed-width assumption so labels of any length line up correctly. When
 * `collapseOnMobile` is set (the country filter has too many options for a
 * small screen), it renders as a native dropdown below the sm breakpoint
 * instead of a scrolling pill row.
 */
export function PillFilter({
  label,
  options,
  value,
  onChange,
  collapseOnMobile,
}: PillFilterProps) {
  const reducedMotion = usePrefersReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [highlight, setHighlight] = useState<{ x: number; width: number } | null>(
    null,
  );

  useEffect(() => {
    function measure() {
      const track = trackRef.current;
      const btn = btnRefs.current.get(value);
      if (!track || !btn) return;
      const trackRect = track.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setHighlight({ x: btnRect.left - trackRect.left, width: btnRect.width });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [value, options]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-primary-foreground/70 text-[11px] font-medium tracking-[0.16em] uppercase">
        {label}
      </span>

      {collapseOnMobile && (
        <div className="border-border bg-card relative flex h-11 items-center rounded-full border px-4 sm:hidden">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="text-ink w-full appearance-none bg-transparent text-sm font-medium outline-none"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="text-ink/40 pointer-events-none absolute right-4 size-4"
            aria-hidden="true"
          />
        </div>
      )}

      <div
        ref={trackRef}
        className={cn(
          "border-border bg-card relative inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          collapseOnMobile && "hidden sm:inline-flex",
        )}
      >
        {highlight && (
          <span
            className={cn(
              "bg-ink absolute top-1 bottom-1 left-0 rounded-full",
              !reducedMotion &&
                "transition-[transform,width] duration-300 ease-[cubic-bezier(0.65,0,0.35,1)]",
            )}
            style={{
              transform: `translateX(${highlight.x}px)`,
              width: highlight.width,
            }}
            aria-hidden="true"
          />
        )}
        {options.map((opt) => (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) btnRefs.current.set(opt.value, el);
            }}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            className={cn(
              "relative z-10 shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors duration-200",
              value === opt.value
                ? "text-background"
                : "text-ink/60 hover:text-ink",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
