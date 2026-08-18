import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceChangeBadgeProps {
  change: number;
  className?: string;
}

// Market-data convention (not the brand palette): green for up, red for
// down, so this reads instantly as gain/loss regardless of Veyro's usual
// terracotta/sage colors.
export function PriceChangeBadge({ change, className }: PriceChangeBadgeProps) {
  const positive = change >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        positive
          ? "bg-[#22C55E]/15 text-[#22C55E]"
          : "bg-[#EF4444]/15 text-[#EF4444]",
        className,
      )}
    >
      {positive ? (
        <ArrowUp className="size-3" />
      ) : (
        <ArrowDown className="size-3" />
      )}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}
