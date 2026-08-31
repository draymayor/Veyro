import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceChangeBadgeProps {
  change: number;
  className?: string;
}

// Up uses the same vibrant green as the app's success color, one
// consistent green across the whole app (docs/design-principles.md). Down
// stays a market-convention red, distinct from the brand's brick red.
export function PriceChangeBadge({ change, className }: PriceChangeBadgeProps) {
  const positive = change >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
        positive
          ? "bg-[#0ECB81]/15 text-[#0ECB81]"
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
