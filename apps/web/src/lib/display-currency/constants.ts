/**
 * Display-only currency preference for Veyro's public, pre-signup pages
 * (homepage rate preview, /gift-cards rate browser, /crypto rate browser).
 *
 * This is entirely separate from a user's wallet currency, which is set
 * explicitly at signup (email/password form, or /select-country for Google
 * OAuth) per docs/product-rules.md rule 13 and never derived from IP or
 * any other heuristic. Nothing in this module should be imported by
 * wallet, signup, or trade rate snapshot logic.
 */

export const DISPLAY_CURRENCY_COOKIE = "veyro_display_currency";

export type DisplayCurrency = "NGN" | "USD";

/**
 * Approximate NGN-per-USD rate used only to convert Platform Rate figures
 * for display when the visitor's detected display currency is USD. This is
 * not a Platform Rate, not a live market rate, and must never be read by
 * trade rate snapshot logic (see docs/product-rules.md rules 1-5).
 */
export const DISPLAY_FX_NGN_PER_USD = 1550;

/**
 * Maps the Vercel edge-provided ip-country header to a default display
 * currency. NG resolves to NGN; any other value, or a missing header
 * (local development, or a request that did not pass through Vercel's
 * edge), falls back to USD.
 */
export function resolveDisplayCurrency(
  ipCountry: string | null | undefined,
): DisplayCurrency {
  return ipCountry === "NG" ? "NGN" : "USD";
}
