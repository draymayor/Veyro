import {
  DISPLAY_FX_NGN_PER_USD,
  type DisplayCurrency,
} from "@/lib/display-currency/constants";

/**
 * Formats an amount that is stored/computed in NGN (Platform Rate payouts,
 * gift card rates) for display in the visitor's detected display currency.
 * Display-only: never use this output to price or record an actual trade.
 */
export function formatDisplayAmount(
  amountNgn: number,
  currency: DisplayCurrency,
): string {
  if (currency === "NGN") {
    return formatNgnDisplay(amountNgn);
  }
  return formatUsdDisplay(amountNgn / DISPLAY_FX_NGN_PER_USD);
}

function formatNgnDisplay(value: number): string {
  if (value >= 100_000) {
    return `\u{20A6}${new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)}`;
  }
  return `\u{20A6}${Math.round(value).toLocaleString("en-US")}`;
}

function formatUsdDisplay(value: number): string {
  const decimals = value < 1 ? 4 : 2;
  return `$${value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
