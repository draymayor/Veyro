import type { SupportCategory } from "@/lib/support/types";

/**
 * Request-type options for the ticket form, same category vocabulary as
 * notifications (docs/database-schema.md's `notifications.category`) plus
 * "other" for anything that doesn't fit, so a user's mental model of
 * "what kind of thing is this about" stays consistent across the app.
 */
export const SUPPORT_CATEGORIES: { value: SupportCategory; label: string }[] = [
  { value: "trades", label: "A Trade" },
  { value: "wallet", label: "Wallet or Withdrawal" },
  { value: "account", label: "Account or Security" },
  { value: "referrals", label: "Referrals" },
  { value: "other", label: "Something Else" },
];
