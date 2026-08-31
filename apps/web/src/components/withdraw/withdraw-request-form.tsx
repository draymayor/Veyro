"use client";

import { useEffect, useState } from "react";
import {
  BuildingLibraryIcon,
  CreditCardIcon,
  PlusIcon,
} from "@heroicons/react/24/solid";
import { authFetch } from "@/lib/api-client";
import { findCountry } from "@/lib/countries";
import {
  fieldSetForCountry,
  summarizeBankAccount,
} from "@/lib/settings/bank-fields";
import type { BankAccount } from "@/lib/settings/bank-accounts";
import { AddBankAccountDialog } from "@/components/settings/add-bank-account-dialog";
import { SAVED_PAYPAL_EMAIL } from "@/lib/settings/data";
import type { CreateWithdrawalPayload } from "@/lib/withdrawals/data";
import { formatWalletAmount } from "@/lib/dashboard/wallet-currency";
import { WithdrawalPinGateDialog } from "@/components/withdraw/withdrawal-pin-gate-dialog";
import { ConfirmationDialog } from "@/components/sell/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Destination = { type: "bank"; id: string } | { type: "paypal" };

interface WithdrawRequestFormProps {
  walletCurrency: string;
  /** The user's real cached wallet balance (get-wallet-balance.ts), denominated in walletCurrency. */
  availableBalance: number;
}

/**
 * Send Fiat to External Account (bank/PayPal) withdrawal form. Its own
 * dedicated flow, separate from Crypto Withdrawal (/withdraw/crypto), a
 * saved-account destination picker rather than an address/network form, so
 * the two never share a component with method tabs (docs/context.md).
 */
export function WithdrawRequestForm({
  walletCurrency,
  availableBalance,
}: WithdrawRequestFormProps) {
  const [amount, setAmount] = useState("");

  const [accounts, setAccounts] = useState<BankAccount[] | null>(null);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [addBankOpen, setAddBankOpen] = useState(false);

  const [pinGateOpen, setPinGateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    authFetch<BankAccount[]>("/bank-accounts")
      .then((data) => {
        if (cancelled) return;
        setAccounts(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setAccountsError(
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

  // Defaults to the user's default bank account, falling back to PayPal if
  // no bank accounts are saved, until the user explicitly picks something
  // else. Derived at render rather than synced via an effect, so there's no
  // extra render pass just to apply the default.
  const defaultAccount = accounts?.find((a) => a.isDefault) ?? accounts?.[0];
  const effectiveDestination: Destination | null =
    destination ??
    (defaultAccount
      ? { type: "bank", id: defaultAccount.id }
      : SAVED_PAYPAL_EMAIL
        ? { type: "paypal" }
        : null);

  const availableBalanceText = formatWalletAmount(
    availableBalance,
    walletCurrency,
    walletCurrency,
  );

  const parsedAmount = Number(amount);
  const amountValid =
    amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const exceedsBalance = amountValid && parsedAmount > availableBalance;

  const canSubmit =
    amountValid && !exceedsBalance && effectiveDestination !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setPinGateOpen(true);
  }

  async function submitWithdrawal() {
    setSubmitting(true);
    setError(null);
    try {
      let payload: CreateWithdrawalPayload;
      if (effectiveDestination?.type === "bank") {
        payload = {
          amount: parsedAmount,
          method: "bank_transfer",
          bankAccountId: effectiveDestination.id,
        };
      } else {
        payload = {
          amount: parsedAmount,
          method: "paypal",
          paypalEmail: SAVED_PAYPAL_EMAIL ?? "",
        };
      }

      await authFetch("/withdrawals", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAmount("");
      setConfirmationOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="amount" className="text-ink text-sm font-medium">
            Amount
          </label>
          <span className="text-ink/45 text-xs">
            Available (Fiat): {availableBalanceText}
          </span>
        </div>
        <div className="border-border bg-card focus-within:border-primary focus-within:ring-primary/30 flex items-center gap-2 rounded-xl border px-4 py-3 focus-within:ring-3">
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step="any"
            placeholder="0.00"
            className="text-ink placeholder:text-ink/35 w-full min-w-0 bg-transparent text-sm tabular-nums outline-none"
          />
          <span className="text-ink/40 shrink-0 text-sm">{walletCurrency}</span>
        </div>
        {exceedsBalance ? (
          <p className="text-error text-xs">
            That&apos;s more than your available balance.
          </p>
        ) : null}
      </div>

      <BankPaypalSection
        accounts={accounts}
        accountsError={accountsError}
        destination={effectiveDestination}
        onSelect={setDestination}
        onAddNew={() => setAddBankOpen(true)}
      />

      {error ? <p className="text-error text-sm">{error}</p> : null}

      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit || submitting}
        className="w-full"
      >
        {submitting ? "Submitting..." : "Request Withdrawal"}
      </Button>

      <AddBankAccountDialog
        open={addBankOpen}
        onOpenChange={setAddBankOpen}
        onAdded={(account) => {
          setAccounts((prev) => [...(prev ?? []), account]);
          setDestination({ type: "bank", id: account.id });
        }}
      />

      <WithdrawalPinGateDialog
        open={pinGateOpen}
        onOpenChange={setPinGateOpen}
        onVerified={() => void submitWithdrawal()}
      />

      <ConfirmationDialog
        open={confirmationOpen}
        onOpenChange={setConfirmationOpen}
        title="Withdrawal requested"
        description="We've received your withdrawal request and it's being processed. You'll get a notification once it's on its way."
      />
    </form>
  );
}

interface BankPaypalSectionProps {
  accounts: BankAccount[] | null;
  accountsError: string | null;
  destination: Destination | null;
  onSelect: (destination: Destination) => void;
  onAddNew: () => void;
}

function BankPaypalSection({
  accounts,
  accountsError,
  destination,
  onSelect,
  onAddNew,
}: BankPaypalSectionProps) {
  const hasPaypal = !!SAVED_PAYPAL_EMAIL;
  const isEmpty = accounts !== null && accounts.length === 0 && !hasPaypal;

  if (accountsError) {
    return <p className="text-error text-sm">{accountsError}</p>;
  }

  if (accounts === null) {
    return (
      <p className="text-ink/45 text-sm">Loading your saved accounts...</p>
    );
  }

  if (isEmpty) {
    return (
      <div className="border-border flex flex-col items-center gap-3 rounded-2xl border border-dashed px-4 py-10 text-center">
        <span className="bg-secondary text-ink/40 flex size-12 items-center justify-center rounded-full">
          <BuildingLibraryIcon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-ink text-sm font-medium">
            No payout method saved yet
          </p>
          <p className="text-ink/50 mt-1 text-xs">
            Add a bank account to withdraw here.
          </p>
        </div>
        <Button type="button" size="lg" onClick={onAddNew}>
          Add Bank Account
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {accounts.map((account) => {
        const fieldSet = fieldSetForCountry(account.country);
        const selected =
          destination?.type === "bank" && destination.id === account.id;
        return (
          <DestinationRow
            key={account.id}
            icon={BuildingLibraryIcon}
            title={summarizeBankAccount(fieldSet, account.bankDetails)}
            subtitle={`${findCountry(account.country)?.name ?? account.country}${account.isDefault ? " · Default" : ""}`}
            selected={selected}
            onClick={() => onSelect({ type: "bank", id: account.id })}
          />
        );
      })}

      {hasPaypal ? (
        <DestinationRow
          icon={CreditCardIcon}
          title="PayPal"
          subtitle={SAVED_PAYPAL_EMAIL ?? ""}
          selected={destination?.type === "paypal"}
          onClick={() => onSelect({ type: "paypal" })}
        />
      ) : null}

      <button
        type="button"
        onClick={onAddNew}
        className="text-primary hover:bg-secondary/50 mt-1 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors sm:px-5"
      >
        <PlusIcon className="size-4" aria-hidden="true" />
        Add new account
      </button>
    </div>
  );
}

function DestinationRow({
  icon: Icon,
  title,
  subtitle,
  selected,
  onClick,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  subtitle: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-secondary/50 flex items-center gap-4 rounded-2xl px-4 py-4 text-left transition-colors sm:px-5"
    >
      <span className="bg-secondary text-ink/60 flex size-10 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-ink block truncate text-sm font-medium">
          {title}
        </span>
        <span className="text-ink/45 block text-xs">{subtitle}</span>
      </span>
      <RadioDot selected={selected} />
    </button>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        selected ? "border-primary" : "border-ink/20",
      )}
      aria-hidden="true"
    >
      {selected ? <span className="bg-primary size-2.5 rounded-full" /> : null}
    </span>
  );
}
