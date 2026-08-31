"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/api-client";
import { userLabel, formatMoney } from "@/lib/admin/users/display";
import type { AdminUserListItem } from "@/lib/admin/users/types";
import type { AdminCryptoAsset } from "@/lib/admin/rates/types";
import type {
  ManualDepositQuote,
  ManualDepositResult,
  ManualDepositType,
} from "@/lib/admin/deposits/types";
import { UserSearchField } from "./user-search-field";

const INPUT_CLASS =
  "border-border bg-card text-ink placeholder:text-ink/35 h-10 w-full rounded-xl border px-3 text-sm outline-none focus-visible:border-ring";

const RADIO_CLASS =
  "border-border data-[state=active]:border-primary data-[state=active]:bg-primary/5 flex-1 cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition-colors";

type Step = "form" | "review" | "done";

function assetKey(asset: AdminCryptoAsset): string {
  return `${asset.symbol}::${asset.network}`;
}

// Formats a credited amount for either deposit type: fiat uses
// Intl.NumberFormat against walletCurrency, crypto (no ISO currency code)
// just appends the symbol - matching admin-deposits.service.ts's own
// formatMoney fiat-only convention.
function formatCredited(quote: {
  depositType: ManualDepositType;
  creditAmount: number;
  walletCurrency: string | null;
  symbol: string | null;
}): string {
  return quote.depositType === "fiat"
    ? formatMoney(quote.creditAmount, quote.walletCurrency!)
    : `${quote.creditAmount} ${quote.symbol}`;
}

function formatBalance(
  quote: {
    depositType: ManualDepositType;
    walletCurrency: string | null;
    symbol: string | null;
  },
  balance: number,
): string {
  return quote.depositType === "fiat"
    ? formatMoney(balance, quote.walletCurrency!)
    : `${balance} ${quote.symbol}`;
}

/**
 * Manual Deposit (docs/admin-guide.md): a review-before-confirm flow for
 * a real financial credit, fill the form, see exactly what will be
 * credited, then confirm. A fiat deposit credits the fiat wallet directly.
 * A crypto deposit is the admin-manual-check half of the hybrid
 * deposit-confirmation model (docs/product-rules.md rule 16): it credits
 * the user's real held crypto_wallets balance for that symbol at face
 * value, no price conversion, the fiat wallet is never touched. The reason
 * field is required to even reach the review step, there is no path that
 * submits without one. Both the ledger credit and the admin_actions log
 * entry are written together in one backend call
 * (AdminDepositsService.execute), never one without the other.
 */
export function ManualDepositForm({
  cryptoAssets,
}: {
  cryptoAssets: AdminCryptoAsset[];
}) {
  const [step, setStep] = useState<Step>("form");
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(
    null,
  );
  const [depositType, setDepositType] = useState<ManualDepositType>("fiat");
  const [amount, setAmount] = useState("");
  const [assetChoice, setAssetChoice] = useState<string>(
    cryptoAssets[0] ? assetKey(cryptoAssets[0]) : "",
  );
  const [reason, setReason] = useState("");
  const [quote, setQuote] = useState<ManualDepositQuote | null>(null);
  const [result, setResult] = useState<ManualDepositResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedAsset = cryptoAssets.find((a) => assetKey(a) === assetChoice);

  const canReview =
    !!selectedUser &&
    Number(amount) > 0 &&
    reason.trim().length > 0 &&
    (depositType === "fiat" || !!selectedAsset);

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || !canReview) return;

    setError(null);
    setSubmitting(true);
    try {
      const preview = await authFetch<ManualDepositQuote>(
        "/admin/deposits/manual/preview",
        {
          method: "POST",
          body: JSON.stringify({
            userId: selectedUser.id,
            depositType,
            amount: Number(amount),
            symbol: selectedAsset?.symbol,
            network: selectedAsset?.network,
          }),
        },
      );
      setQuote(preview);
      setStep("review");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not preview this deposit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!selectedUser) return;

    setError(null);
    setSubmitting(true);
    try {
      const executed = await authFetch<ManualDepositResult>(
        "/admin/deposits/manual",
        {
          method: "POST",
          body: JSON.stringify({
            userId: selectedUser.id,
            depositType,
            amount: Number(amount),
            symbol: selectedAsset?.symbol,
            network: selectedAsset?.network,
            reason: reason.trim(),
          }),
        },
      );
      setResult(executed);
      setStep("done");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not complete this deposit.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setStep("form");
    setSelectedUser(null);
    setDepositType("fiat");
    setAmount("");
    setReason("");
    setQuote(null);
    setResult(null);
    setError(null);
  }

  if (step === "done" && result) {
    return (
      <div className="border-border bg-card flex flex-col items-center gap-3 rounded-2xl border p-6 text-center">
        <p className="text-ink font-heading text-base font-semibold">
          Deposit credited
        </p>
        <p className="text-ink/60 text-sm">
          {formatCredited(result)} credited to{" "}
          {userLabel(result.displayName, result.userId)}.
        </p>
        <p className="text-ink/50 text-sm">
          New {result.depositType === "fiat" ? "wallet" : "crypto"} balance:{" "}
          {formatBalance(result, result.newBalance)}
        </p>
        <Button size="sm" onClick={startOver}>
          Credit another deposit
        </Button>
      </div>
    );
  }

  if (step === "review" && quote) {
    return (
      <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-5">
        <div>
          <h2 className="text-ink/60 mb-2 text-xs font-semibold tracking-wide uppercase">
            Review before confirming
          </h2>
          <div className="flex flex-col gap-1.5 text-sm">
            <Row
              label="User"
              value={userLabel(quote.displayName, quote.userId)}
            />
            <Row label="Source" value={quote.sourceLabel} />
            <Row label="Amount credited" value={formatCredited(quote)} />
            <Row label="Reason" value={reason} />
          </div>
        </div>

        <p className="text-ink/50 text-xs leading-relaxed">
          This credits the user&apos;s{" "}
          {quote.depositType === "fiat" ? "wallet" : "crypto balance"}{" "}
          immediately and cannot be undone, only offset with a new ledger entry.
          Confirm the amount above is correct before proceeding.
        </p>

        {error ? <p className="text-error text-sm">{error}</p> : null}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep("form")}
            disabled={submitting}
          >
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={handleConfirm}
            disabled={submitting}
          >
            {submitting ? "Crediting..." : "Confirm credit"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleReview}
      className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-5"
    >
      <Field label="User">
        <UserSearchField selected={selectedUser} onSelect={setSelectedUser} />
      </Field>

      <Field label="Deposit type">
        <div className="flex gap-2">
          {(["fiat", "crypto"] as ManualDepositType[]).map((type) => (
            <button
              key={type}
              type="button"
              data-state={depositType === type ? "active" : "inactive"}
              onClick={() => setDepositType(type)}
              className={RADIO_CLASS}
            >
              {type === "fiat" ? "Fiat" : "Crypto"}
            </button>
          ))}
        </div>
      </Field>

      {depositType === "crypto" ? (
        <Field label="Asset / network">
          <select
            className={INPUT_CLASS}
            value={assetChoice}
            onChange={(e) => setAssetChoice(e.target.value)}
          >
            {cryptoAssets.length === 0 ? (
              <option value="">No active crypto assets configured</option>
            ) : (
              cryptoAssets.map((asset) => (
                <option key={assetKey(asset)} value={assetKey(asset)}>
                  {asset.symbol} ({asset.network})
                </option>
              ))
            )}
          </select>
        </Field>
      ) : null}

      <Field
        label={
          depositType === "crypto"
            ? `Amount (${selectedAsset?.symbol ?? "crypto units"})`
            : `Amount${selectedUser?.currency ? ` (${selectedUser.currency})` : ""}`
        }
      >
        <input
          type="number"
          step="any"
          min="0"
          className={INPUT_CLASS}
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      <Field label="Reason (required)">
        <textarea
          rows={3}
          className={INPUT_CLASS.replace("h-10", "min-h-20 py-2")}
          placeholder="Why is this manual credit needed? Logged for audit."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>

      {error ? <p className="text-error text-sm">{error}</p> : null}

      <Button type="submit" disabled={!canReview || submitting}>
        {submitting ? "Loading..." : "Review deposit"}
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-ink text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-ink/50 shrink-0">{label}</span>
      <span className="text-ink text-right font-medium break-words">
        {value}
      </span>
    </div>
  );
}
