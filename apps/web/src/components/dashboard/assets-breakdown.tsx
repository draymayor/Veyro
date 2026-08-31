"use client";

import { BanknotesIcon } from "@heroicons/react/24/solid";
import { useBalanceVisibility } from "@/lib/dashboard/use-balance-visibility";

// Fixed-width placeholder for a hidden amount, independent of the real
// figure's digit count, matching digit count would leak roughly how
// large the balance is, which defeats the point of hiding it. Same
// placeholder BalanceCard uses, so the two read as one consistent toggle.
const HIDDEN_AMOUNT_PLACEHOLDER = "******";

interface AssetsBreakdownProps {
  balance: number;
  currency: string;
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  }
}

/**
 * "Your Assets" (fiat) section on the Assets page (docs/context.md),
 * shown above the "Your Crypto" section (crypto-breakdown.tsx) per
 * context.md's ordering. Exactly one row: the user's single
 * primary-currency wallet (docs/database-schema.md's `wallets` table, one
 * row per user) - crypto balances are tracked separately in
 * crypto_wallets, not here. Flat rows, no shadows or dividers between
 * them, per design-principles.md's List/Row Styling rule, same visual
 * language as the transaction history list below it.
 */
export function AssetsBreakdown({ balance, currency }: AssetsBreakdownProps) {
  // Shares the same hide/unhide state as BalanceCard (docs/design-principles.md
  // consistency): this row is that same wallet balance shown a second time,
  // so it hides in lockstep with the balance figure above it, not
  // independently.
  const [hidden] = useBalanceVisibility();
  const amountText = formatCurrency(balance, currency);

  return (
    <section>
      <h2 className="text-ink font-heading mb-2 text-base font-medium">
        Your Assets
      </h2>
      <div className="flex flex-col">
        <div className="flex items-center gap-4 rounded-2xl px-1 py-4 sm:px-2">
          <span className="bg-secondary text-ink/60 flex size-10 shrink-0 items-center justify-center rounded-full">
            <BanknotesIcon className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-ink block text-sm font-medium">
              {currency}
            </span>
            <span className="text-ink/45 block text-xs">Wallet balance</span>
          </span>
          <span className="text-ink shrink-0 text-sm font-medium tabular-nums">
            {hidden ? HIDDEN_AMOUNT_PLACEHOLDER : amountText}
          </span>
        </div>
      </div>
    </section>
  );
}
