"use client";

import { useEffect, useState } from "react";
import {
  BuildingLibraryIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { authFetch } from "@/lib/api-client";
import { findCountry } from "@/lib/countries";
import {
  fieldSetForCountry,
  summarizeBankAccount,
} from "@/lib/settings/bank-fields";
import { AddBankAccountDialog } from "@/components/settings/add-bank-account-dialog";
import type { BankAccount } from "@/lib/settings/bank-accounts";

/**
 * Multiple saved bank accounts, country-conditional fields per
 * docs/product-rules.md rule 19, exactly one marked default. Loads from
 * the API rather than local placeholder state (unlike the other payment
 * method rows in this section), since the per-country field validation on
 * add lives server-side in bank-accounts.service.ts, not in this form.
 */
export function BankAccountsList() {
  const [accounts, setAccounts] = useState<BankAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    authFetch<BankAccount[]>("/bank-accounts")
      .then((data) => {
        if (!cancelled) setAccounts(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load your saved bank accounts.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSetDefault(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await authFetch(`/bank-accounts/${id}/default`, { method: "PATCH" });
      setAccounts(
        (prev) => prev?.map((a) => ({ ...a, isDefault: a.id === id })) ?? prev,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not set this account as default.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await authFetch(`/bank-accounts/${id}`, { method: "DELETE" });
      setAccounts((prev) => prev?.filter((a) => a.id !== id) ?? prev);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove this bank account.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-1 px-2 py-2 sm:px-3">
      <p className="text-ink text-sm font-medium">Bank Transfer</p>

      {accounts === null && !error ? (
        <p className="text-ink/45 text-xs">Loading your saved accounts...</p>
      ) : null}

      {error ? <p className="text-error text-xs">{error}</p> : null}

      {accounts && accounts.length === 0 ? (
        <p className="text-ink/45 text-xs">No bank accounts saved yet.</p>
      ) : null}

      {accounts?.map((account) => {
        const fieldSet = fieldSetForCountry(account.country);
        return (
          <div
            key={account.id}
            className="flex items-center gap-3 rounded-xl py-2"
          >
            <span className="bg-secondary text-ink/60 flex size-9 shrink-0 items-center justify-center rounded-full">
              <BuildingLibraryIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-ink truncate text-sm font-medium">
                {summarizeBankAccount(fieldSet, account.bankDetails)}
              </p>
              <p className="text-ink/45 text-xs">
                {findCountry(account.country)?.name ?? account.country}
                {account.isDefault ? " · Default" : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!account.isDefault ? (
                <button
                  type="button"
                  onClick={() => handleSetDefault(account.id)}
                  disabled={busyId === account.id}
                  aria-label="Set as default"
                  className="text-ink/40 hover:bg-secondary hover:text-ink flex size-7 items-center justify-center rounded-full transition-colors disabled:opacity-50"
                >
                  <StarIcon className="size-3.5" aria-hidden="true" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleRemove(account.id)}
                disabled={busyId === account.id}
                aria-label="Remove bank account"
                className="text-ink/40 hover:bg-destructive/10 hover:text-destructive flex size-7 items-center justify-center rounded-full transition-colors disabled:opacity-50"
              >
                <TrashIcon className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className="text-primary hover:bg-secondary/60 -mx-2 mt-1 flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-medium transition-colors sm:-mx-3 sm:px-3"
      >
        <PlusIcon className="size-4" aria-hidden="true" />
        Add Bank Account
      </button>

      <AddBankAccountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(account) => setAccounts((prev) => [...(prev ?? []), account])}
      />
    </div>
  );
}
