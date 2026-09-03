import {
  DISPLAY_FX_NGN_PER_USD,
  type DisplayCurrency,
} from "@/lib/display-currency/constants";

/**
 * Formats an amount that is stored/computed in NGN (gift card Platform
 * Rates only) for display in the visitor's detected display currency.
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

/**
 * Formats a crypto payout quote (GET /crypto/payout) for display. Unlike
 * formatDisplayAmount above, this amount is NOT in NGN - useCryptoPayout
 * already requests it converted server-side into `currency` (the FX rate
 * applied once, there), so it must only be formatted here, never converted
 * again. Passing a crypto payout through formatDisplayAmount silently
 * divides it by DISPLAY_FX_NGN_PER_USD a second time whenever the display
 * currency is USD.
 */
export function formatCryptoPayout(
  amount: number,
  currency: DisplayCurrency,
): string {
  return currency === "NGN"
    ? formatNgnDisplay(amount)
    : formatUsdDisplay(amount);
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
