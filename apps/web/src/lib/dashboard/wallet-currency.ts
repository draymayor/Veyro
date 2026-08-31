/**
 * Display currency for the Home balance card only. Purely cosmetic per
 * docs/context.md and docs/product-rules.md rule 13: changes how the
 * balance figure is shown to this user, never the user's actual wallet
 * currency, balance, or any ledger entry. Deliberately separate from
 * src/lib/display-currency (that module is scoped to public, pre-signup
 * pages and is not meant to be imported by anything wallet-related).
 */

export type WalletCurrency = string;

export interface WalletCurrencyOption {
  code: WalletCurrency;
  label?: string;
}

const CURRENCY_NAMES: Record<string, string> = {
  NGN: "Nigerian Naira",
  USD: "US Dollar",
  GBP: "British Pound",
  EUR: "Euro",
  GHS: "Ghanaian Cedi",
  KES: "Kenyan Shilling",
  ZAR: "South African Rand",
  EGP: "Egyptian Pound",
  INR: "Indian Rupee",
  CAD: "Canadian Dollar",
  AUD: "Australian Dollar",
  JPY: "Japanese Yen",
  CNY: "Chinese Yuan",
  CHF: "Swiss Franc",
  SEK: "Swedish Krona",
  NOK: "Norwegian Krone",
  DKK: "Danish Krone",
  BRL: "Brazilian Real",
  MXN: "Mexican Peso",
  IDR: "Indonesian Rupiah",
  PHP: "Philippine Peso",
  PKR: "Pakistani Rupee",
  BDT: "Bangladeshi Taka",
  VND: "Vietnamese Dong",
  THB: "Thai Baht",
  TRY: "Turkish Lira",
  AED: "UAE Dirham",
  SAR: "Saudi Riyal",
  PLN: "Polish Zloty",
  NZD: "New Zealand Dollar",
  SGD: "Singapore Dollar",
};

/** Illustrative rate, units of currency per 1 USD. Display only, not a live rate feed. */
const PER_USD: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  NGN: 1550,
  GHS: 15.5,
  KES: 129,
  ZAR: 18.3,
  EGP: 49,
  CAD: 1.36,
  AUD: 1.52,
  JPY: 149,
  CNY: 7.1,
  INR: 83,
  CHF: 0.88,
  SEK: 10.4,
  NOK: 10.6,
  DKK: 6.9,
  BRL: 5.4,
  MXN: 17,
  IDR: 15_700,
  PHP: 56,
  PKR: 279,
  BDT: 110,
  VND: 24_500,
  THB: 35,
  TRY: 32,
  AED: 3.67,
  SAR: 3.75,
  PLN: 4.0,
  NZD: 1.63,
  SGD: 1.34,
};

const ALWAYS_OFFERED = ["USD", "GBP", "EUR"];

/**
 * The currencies a user may view their balance in: their own country's
 * currency (set at signup, per docs/product-rules.md rule 13) plus the
 * three majors, deduplicated. A Nigerian user sees NGN/USD/GBP/EUR; a user
 * from Ghana or India sees GHS/USD/GBP/EUR or INR/USD/GBP/EUR, never a
 * currency that isn't theirs or one of the three majors.
 */
export function walletCurrencyOptions(
  homeCurrency: WalletCurrency,
): WalletCurrencyOption[] {
  const codes = [homeCurrency, ...ALWAYS_OFFERED].filter(
    (code, index, all) => all.indexOf(code) === index,
  );
  return codes.map((code) => ({ code, label: CURRENCY_NAMES[code] }));
}

function unitsPerBase(
  baseCurrency: WalletCurrency,
  targetCurrency: WalletCurrency,
  ratesPerUsd: Record<string, number>,
): number {
  // The live feed's free tier omits some currencies rather than erroring,
  // so a missing entry must fall back to that currency's own static rate,
  // not silently substitute USD's, target=base with a missing live entry
  // would otherwise collapse to some other ratio instead of the correct
  // 1:1.
  const perUsdTarget =
    ratesPerUsd[targetCurrency] ?? PER_USD[targetCurrency] ?? PER_USD.USD;
  const perUsdBase =
    ratesPerUsd[baseCurrency] ?? PER_USD[baseCurrency] ?? PER_USD.USD;
  return perUsdTarget / perUsdBase;
}

/**
 * @param amount A real wallet figure, denominated in the user's own wallet
 * currency (baseCurrency), e.g. the balance from get-wallet-summary.ts.
 * @param baseCurrency The currency `amount` is actually denominated in.
 * @param targetCurrency The currency to display it as (the balance card's
 * currency selector, purely cosmetic per docs/product-rules.md rule 13).
 * @param liveRatesPerUsd Live FX rates from useFxRates, when available.
 * Falls back to the static illustrative table (e.g. while the first poll
 * is still in flight) so the balance never has nothing to render.
 */
export function walletAmountValue(
  amount: number,
  baseCurrency: WalletCurrency,
  targetCurrency: WalletCurrency,
  liveRatesPerUsd?: Record<string, number>,
): number {
  return (
    amount *
    unitsPerBase(baseCurrency, targetCurrency, liveRatesPerUsd ?? PER_USD)
  );
}

export function formatWalletAmount(
  amount: number,
  baseCurrency: WalletCurrency,
  targetCurrency: WalletCurrency,
  liveRatesPerUsd?: Record<string, number>,
): string {
  const value = walletAmountValue(
    amount,
    baseCurrency,
    targetCurrency,
    liveRatesPerUsd,
  );
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: targetCurrency,
    }).format(value);
  } catch {
    return `${targetCurrency} ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}
