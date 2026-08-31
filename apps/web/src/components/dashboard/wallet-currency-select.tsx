"use client";

import { DropdownMenu } from "radix-ui";
import { ChevronUpDownIcon, CheckIcon } from "@heroicons/react/24/solid";
import type {
  WalletCurrency,
  WalletCurrencyOption,
} from "@/lib/dashboard/wallet-currency";

interface WalletCurrencySelectProps {
  value: WalletCurrency;
  options: WalletCurrencyOption[];
  onChange: (currency: WalletCurrency) => void;
}

/**
 * Tap target beside "Wallet Balance" to switch the display currency the
 * balance figure is shown in. Cosmetic only, see lib/dashboard/wallet-currency.
 * `options` is scoped to the signed-in user's own currency plus USD/GBP/EUR,
 * never every currency in the app.
 */
export function WalletCurrencySelect({
  value,
  options,
  onChange,
}: WalletCurrencySelectProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="border-border hover:bg-secondary/60 text-ink/60 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors"
        >
          {value}
          <ChevronUpDownIcon className="size-3.5" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="border-border bg-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 w-48 rounded-xl border p-1 shadow-lg"
        >
          {options.map((currency) => (
            <DropdownMenu.Item
              key={currency.code}
              onSelect={() => onChange(currency.code)}
              className="hover:bg-secondary flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm outline-none"
            >
              <span className="text-ink">
                {currency.code}{" "}
                {currency.label && (
                  <span className="text-ink/45">{currency.label}</span>
                )}
              </span>
              {currency.code === value && (
                <CheckIcon className="text-primary size-4" aria-hidden="true" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
