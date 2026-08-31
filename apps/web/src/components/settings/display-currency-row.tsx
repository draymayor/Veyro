"use client";

import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import {
  GlobeAltIcon,
  ChevronUpDownIcon,
  CheckIcon,
} from "@heroicons/react/24/solid";
import { walletCurrencyOptions } from "@/lib/dashboard/wallet-currency";
import { SettingsRow } from "@/components/settings/settings-row";

interface DisplayCurrencyRowProps {
  /** The user's actual wallet currency, used only to scope which extra currency shows up as an option, never as this selector's default. */
  homeCurrency: string;
}

const GLOBAL_DEFAULT_CURRENCY = "USD";

/**
 * Settings' own display currency preference. Deliberately not wired to
 * the Home balance card's WalletCurrencySelect state (lib/dashboard/wallet-currency),
 * that selector is scoped to the balance card only. This one is the
 * account-wide preference described in docs/context.md: purely cosmetic,
 * affects only how prices/rates are shown to this user, and must never
 * touch the user's actual wallet currency, balance, or any ledger entry
 * or trade rate (docs/product-rules.md rule 13). No `users` column exists
 * for this yet, so selection lives in local state pending a real save
 * endpoint, defaulting to USD per the global default rather than the
 * user's home currency.
 */
export function DisplayCurrencyRow({ homeCurrency }: DisplayCurrencyRowProps) {
  const [currency, setCurrency] = useState(GLOBAL_DEFAULT_CURRENCY);
  const options = walletCurrencyOptions(homeCurrency);

  return (
    <SettingsRow
      icon={GlobeAltIcon}
      label="Display Currency"
      description="Cosmetic only. Your wallet balance and trade rates are unaffected."
      right={
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="border-border hover:bg-secondary/60 text-ink/70 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
            >
              {currency}
              <ChevronUpDownIcon className="size-3.5" aria-hidden="true" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="border-border bg-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 z-50 w-48 rounded-xl border p-1 shadow-lg"
            >
              {options.map((option) => (
                <DropdownMenu.Item
                  key={option.code}
                  onSelect={() => setCurrency(option.code)}
                  className="hover:bg-secondary flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  <span className="text-ink">
                    {option.code}{" "}
                    {option.label ? (
                      <span className="text-ink/45">{option.label}</span>
                    ) : null}
                  </span>
                  {option.code === currency ? (
                    <CheckIcon
                      className="text-primary size-4"
                      aria-hidden="true"
                    />
                  ) : null}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      }
    />
  );
}
