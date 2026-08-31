"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardDocumentIcon,
  QrCodeIcon,
  ChevronRightIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";
import { authFetch } from "@/lib/api-client";
import { AssetIcon } from "@/components/crypto/asset-icon";
import { NetworkField } from "@/components/crypto/network-field";
import type { CryptoAsset } from "@/lib/crypto/data";
import { networkById } from "@/lib/crypto/data";
import {
  looksLikeValidAddress,
  type CreateWithdrawalPayload,
} from "@/lib/withdrawals/data";
import { WithdrawalPinGateDialog } from "@/components/withdraw/withdrawal-pin-gate-dialog";
import { ConfirmationDialog } from "@/components/sell/confirmation-dialog";
import { Button } from "@/components/ui/button";

interface CryptoWithdrawFormProps {
  asset: CryptoAsset;
  /** The user's real held crypto_wallets balance for this symbol (get-crypto-wallet-balance.ts), in the asset's own units. */
  availableBalance: number;
}

/**
 * Crypto Withdrawal form (docs/context.md), its own dedicated page/route,
 * not a tab inside the bank/PayPal withdrawal form. Amount and available
 * balance are in the selected crypto asset's own units (matching the
 * Binance/MEXC reference pattern). Veyro now holds a real, separate
 * crypto_wallets balance per user/symbol (docs/product-rules.md rules
 * 6a/16) - `availableBalance` is that real figure directly, not derived
 * from the fiat wallet via a live price conversion.
 */
export function CryptoWithdrawForm({
  asset,
  availableBalance,
}: CryptoWithdrawFormProps) {
  const [networkId, setNetworkId] = useState(asset.networks[0].id);
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");

  const [pinGateOpen, setPinGateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const network = networkById(asset, networkId);

  const availableBalanceText = `${availableBalance.toLocaleString("en-US", {
    maximumFractionDigits: 8,
  })} ${asset.symbol}`;

  const parsedAmount = Number(amount);
  const amountValid =
    amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount > 0;
  const exceedsBalance = amountValid && parsedAmount > availableBalance;

  const addressLooksValid =
    address.trim() === "" || looksLikeValidAddress(network.id, address);

  const canSubmit = address.trim() !== "" && amountValid && !exceedsBalance;

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setAddress(text.trim());
    } catch {
      // Clipboard access denied or unsupported, the user can still type/paste manually.
    }
  }

  function handleMax() {
    setAmount(availableBalance > 0 ? String(availableBalance) : "");
  }

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
      // amount is in asset.symbol units here, unlike the bank/PayPal
      // withdrawal form where it's in Fiat currency; the withdrawals row
      // records whichever unit its own method implies.
      const payload: CreateWithdrawalPayload = {
        amount: parsedAmount,
        method: "crypto",
        cryptoSymbol: asset.symbol,
        cryptoNetwork: network.label,
        cryptoPayoutAddress: address.trim(),
        remarks: remarks.trim() || undefined,
      };

      await authFetch("/withdrawals", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAddress("");
      setAmount("");
      setRemarks("");
      setConfirmationOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Link
        href="/withdraw/crypto"
        className="border-border bg-card hover:bg-secondary/50 flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors"
      >
        <span className="bg-secondary flex size-9 shrink-0 items-center justify-center rounded-full p-2">
          <AssetIcon iconKey={asset.iconKey} className="size-full" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-ink block text-sm font-medium">
            {asset.name}
          </span>
          <span className="text-ink/45 block text-xs tracking-wide uppercase">
            {asset.symbol}
          </span>
        </span>
        <ChevronRightIcon
          className="text-ink/30 size-4 shrink-0"
          aria-hidden="true"
        />
      </Link>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="withdraw-address"
          className="text-ink text-sm font-medium"
        >
          Address
        </label>
        <div className="border-border bg-card focus-within:border-primary focus-within:ring-primary/30 flex items-center gap-2 rounded-xl border px-4 py-3 focus-within:ring-3">
          <input
            id="withdraw-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Please enter the address"
            className="text-ink placeholder:text-ink/35 w-full min-w-0 bg-transparent text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void handlePaste()}
            aria-label="Paste address"
            className="text-ink/40 hover:text-ink shrink-0 transition-colors"
          >
            <ClipboardDocumentIcon className="size-4.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Scan QR code"
            className="text-ink/40 hover:text-ink shrink-0 transition-colors"
          >
            <QrCodeIcon className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        {!addressLooksValid ? (
          <p className="text-ink/60 flex items-start gap-1.5 text-xs">
            <InformationCircleIcon
              className="text-primary mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            This doesn&apos;t look like a typical {network.label} address.
            Double-check it before continuing.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-ink text-sm font-medium">Network</span>
        <NetworkField
          networks={asset.networks}
          value={networkId}
          onChange={setNetworkId}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="withdraw-amount"
          className="text-ink text-sm font-medium"
        >
          Amount
        </label>
        <div className="border-border bg-card focus-within:border-primary focus-within:ring-primary/30 flex items-center gap-2 rounded-xl border px-4 py-3 focus-within:ring-3">
          <input
            id="withdraw-amount"
            type="number"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            step="any"
            placeholder="Please enter the withdrawal amount"
            className="text-ink placeholder:text-ink/35 w-full min-w-0 bg-transparent text-sm tabular-nums outline-none"
          />
          <button
            type="button"
            onClick={handleMax}
            className="text-primary shrink-0 text-xs font-semibold"
          >
            Max
          </button>
          <span className="text-ink/40 shrink-0 text-sm">{asset.symbol}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink/45 text-xs">
            Available: {availableBalanceText}
          </span>
          {exceedsBalance ? (
            <span className="text-error text-xs">
              More than your available balance.
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="withdraw-remarks"
          className="text-ink text-sm font-medium"
        >
          Remarks <span className="text-ink/40 font-normal">(optional)</span>
        </label>
        <textarea
          id="withdraw-remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Please enter withdrawal instructions"
          rows={2}
          className="border-border bg-card focus:border-primary focus:ring-primary/30 text-ink placeholder:text-ink/35 w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none focus:ring-3"
        />
      </div>

      <p className="text-ink/45 border-border bg-secondary/40 rounded-xl border p-3 text-xs">
        Double-check the address and network before sending. Crypto sent to the
        wrong network or address cannot be recovered.
      </p>

      {error ? <p className="text-error text-sm">{error}</p> : null}

      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit || submitting}
        className="w-full"
      >
        {submitting ? "Submitting..." : "Withdraw"}
      </Button>

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
