/**
 * Illustrative Settings-page data. No backend wiring yet (docs/context.md
 * leaves this to a later pass) for PayPal or notification preferences,
 * shaped so real queries can populate this without touching the
 * components that render it. Saved bank accounts are real now (see
 * lib/settings/bank-accounts.ts and BankAccountsList), everything else
 * here stays placeholder until its own save action is wired to the
 * backend.
 */

export const SAVED_PAYPAL_EMAIL: string | null = "mayowa.trades@gmail.com";

/** Mirrors notifications.category (docs/database-schema.md). */
export type NotificationCategory =
  "trades" | "wallet" | "referrals" | "account";

export interface NotificationPreference {
  category: NotificationCategory;
  label: string;
  description: string;
  enabled: boolean;
}

export const NOTIFICATION_PREFERENCES: NotificationPreference[] = [
  {
    category: "trades",
    label: "Trades",
    description: "Status updates on your gift card and crypto submissions.",
    enabled: true,
  },
  {
    category: "wallet",
    label: "Wallet",
    description: "Withdrawal status and wallet credit updates.",
    enabled: true,
  },
  {
    category: "referrals",
    label: "Referrals",
    description: "When someone you referred signs up or trades.",
    enabled: true,
  },
  {
    category: "account",
    label: "Account",
    description: "Security and account-related alerts.",
    enabled: true,
  },
];
