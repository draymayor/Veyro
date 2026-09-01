export interface AdminGiftCardBrand {
  id: string;
  name: string;
  slug: string | null;
  is_active: boolean;
}

export interface AdminGiftCardRate {
  id: string;
  brand_id: string;
  brand_name: string;
  country: string;
  card_type: string;
  min_denomination: number;
  max_denomination: number;
  rate: number;
  currency: string;
  is_active: boolean;
}

export interface AdminCryptoAsset {
  id: string;
  symbol: string;
  network: string;
  deposit_address: string;
  margin_percentage: number;
  is_active: boolean;
  live_price_usd: number | null;
}

export interface AdminPlatformSetting {
  key: string;
  value: string;
  updated_at: string;
}

// Human-readable labels for known platform_settings keys, so admin sees
// "Referral bonus (USD)" instead of raw_snake_case_key text and can't
// confuse two similarly-named keys for the same setting. Add an entry here
// whenever a new key is introduced instead of leaving it to display as raw
// text, that ambiguity is exactly what caused crypto_withdrawal_requires_approval
// and crypto_withdrawals_require_approval to coexist as separate keys.
export const PLATFORM_SETTING_LABELS: Record<string, string> = {
  referral_bonus_usd: "Referral bonus (USD)",
  crypto_withdrawal_requires_approval:
    "Require approval for crypto withdrawals",
  crypto_withdrawal_signing_mode: "Crypto withdrawal signing mode",
};

// Fallback for any key not in the map above: turn snake_case into Title
// Case so an unlabeled setting still reads as a sentence, not a raw key.
export function humanizeSettingKey(key: string): string {
  return key
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function labelForSettingKey(key: string): string {
  return PLATFORM_SETTING_LABELS[key] ?? humanizeSettingKey(key);
}

// Keys that already have a dedicated, purpose-built control somewhere
// else in the admin UI (CryptoApprovalToggle on /admin/withdrawals for
// this one), hidden from the generic Platform Settings table so a given
// setting is never editable from two different controls at once. This is
// distinct from the earlier duplicate-key cleanup (two different DB rows
// for the same idea): this is one real row with two UI surfaces pointed
// at it, which is its own source of confusion even with a single key.
export const SETTINGS_WITH_DEDICATED_UI: Record<string, string> = {
  crypto_withdrawal_requires_approval: "/admin/withdrawals",
  crypto_withdrawal_signing_mode:
    "/admin/rates (Crypto Withdrawal Signing Mode toggle above)",
};

export type SettingValueKind = "boolean" | "number" | "text";

// Infers the right input type from a setting's current value, general
// logic applied to every row rather than a hardcoded key check, so any
// future boolean or numeric setting gets the right input automatically.
// A value of literal "true"/"false" renders as a toggle, a purely numeric
// value renders as a number input, anything else falls back to text.
export function settingValueKind(value: string): SettingValueKind {
  const trimmed = value.trim();
  if (trimmed === "true" || trimmed === "false") return "boolean";
  if (trimmed !== "" && /^-?\d+(\.\d+)?$/.test(trimmed)) return "number";
  return "text";
}

export const CARD_TYPE_OPTIONS = [
  { value: "e-code", label: "E-code" },
  { value: "physical", label: "Physical" },
];
