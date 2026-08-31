import type { BadgeTone } from "@/lib/dashboard/trade-status";
import { cn } from "@/lib/utils";

const TONE_STYLE: Record<BadgeTone, string> = {
  success: "bg-success/15 text-success",
  neutral: "bg-secondary text-ink/60",
  error: "bg-error/15 text-error",
};

interface StatusBadgeProps {
  label: string;
  tone: BadgeTone;
  className?: string;
}

/**
 * The one status pill every trade/withdrawal status renders through, so a
 * given tone always looks identical wherever it appears (dashboard
 * widgets, Assets transaction history, admin views later), per
 * docs/design-principles.md's Trust Signals section.
 */
export function StatusBadge({ label, tone, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
        TONE_STYLE[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
