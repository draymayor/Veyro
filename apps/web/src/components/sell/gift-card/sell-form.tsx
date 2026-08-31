"use client";

import { useMemo, useState } from "react";
import { Tabs } from "radix-ui";
import { ImageUpload } from "@/components/sell/gift-card/image-upload";
import { ConfirmationDialog } from "@/components/sell/confirmation-dialog";
import { Button } from "@/components/ui/button";
import type { CardType, GiftCardRate } from "@/lib/gift-cards/data";
import { createGiftCardTrade, uploadTradeFile } from "@/lib/trades/gift-card";

const TAB_TRIGGER =
  "text-ink/50 data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-sm flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

interface GiftCardSellFormProps {
  physicalRate: GiftCardRate | null;
  ecodeRate: GiftCardRate | null;
  defaultType: CardType;
}

/**
 * Submission form for one brand + country combination. Physical/E-code
 * live as tabs here (not on the list page) because the rate, denomination
 * range, and required fields all vary by type even within the same
 * country, per gift_card_rates' brand -> country -> type -> denomination
 * shape (docs/database-schema.md).
 */
export function GiftCardSellForm({
  physicalRate,
  ecodeRate,
  defaultType,
}: GiftCardSellFormProps) {
  const initialTab: CardType =
    defaultType === "physical" && physicalRate
      ? "physical"
      : defaultType === "e-code" && ecodeRate
        ? "e-code"
        : physicalRate
          ? "physical"
          : "e-code";

  const [tab, setTab] = useState<CardType>(initialTab);
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeRate = tab === "physical" ? physicalRate : ecodeRate;

  const parsedAmount = Number(amount);
  const amountValid =
    !!activeRate &&
    amount.trim() !== "" &&
    Number.isFinite(parsedAmount) &&
    parsedAmount >= activeRate.minDenomination &&
    parsedAmount <= activeRate.maxDenomination;

  const payout =
    amountValid && activeRate ? parsedAmount * activeRate.rate : null;

  const detailsValid =
    tab === "physical" ? images.length > 0 : code.trim().length > 0;

  const canSubmit = amountValid && detailsValid;

  function resetForm() {
    setAmount("");
    setCode("");
    setPin("");
    setImages([]);
    setSubmitError(null);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !activeRate || submitting) return;

    setSubmitError(null);
    setSubmitting(true);
    try {
      const trade = await createGiftCardTrade({
        brandSlug: activeRate.brandId,
        country: activeRate.country,
        cardType: activeRate.cardType,
        amount: parsedAmount,
        cardCode: tab === "e-code" ? code.trim() : undefined,
        cardPin: tab === "e-code" && pin.trim() ? pin.trim() : undefined,
      });

      if (tab === "physical") {
        for (const file of images) {
          await uploadTradeFile(trade.id, "card_image", file);
        }
      }

      setDialogOpen(true);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Tabs.Root
        value={tab}
        onValueChange={(value) => setTab(value as CardType)}
      >
        <Tabs.List className="bg-secondary/70 flex gap-1 rounded-full p-1">
          <Tabs.Trigger
            type="button"
            value="physical"
            disabled={!physicalRate}
            className={TAB_TRIGGER}
          >
            Physical
          </Tabs.Trigger>
          <Tabs.Trigger
            type="button"
            value="e-code"
            disabled={!ecodeRate}
            className={TAB_TRIGGER}
          >
            E-code
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="physical" className="mt-5">
          <ImageUpload files={images} onChange={setImages} />
        </Tabs.Content>

        <Tabs.Content value="e-code" className="mt-5 flex flex-col gap-4">
          <Field label="Enter your gift card code">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              className="border-border bg-card focus:border-primary focus:ring-primary/30 text-ink placeholder:text-ink/35 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-3"
            />
          </Field>
          <Field label="PIN (if applicable)">
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Optional"
              className="border-border bg-card focus:border-primary focus:ring-primary/30 text-ink placeholder:text-ink/35 w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-3"
            />
          </Field>
        </Tabs.Content>
      </Tabs.Root>

      {activeRate && (
        <Field
          label={`Amount ($${activeRate.minDenomination} - $${activeRate.maxDenomination})`}
        >
          <div className="border-border bg-card focus-within:border-primary focus-within:ring-primary/30 flex items-center gap-2 rounded-xl border px-4 py-3 focus-within:ring-3">
            <span className="text-ink/40 text-sm">$</span>
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={activeRate.minDenomination}
              max={activeRate.maxDenomination}
              placeholder="0.00"
              className="text-ink placeholder:text-ink/35 w-full bg-transparent text-sm tabular-nums outline-none"
            />
          </div>
          {amount.trim() !== "" && !amountValid && (
            <p className="text-error mt-1.5 text-xs">
              Enter an amount between ${activeRate.minDenomination} and $
              {activeRate.maxDenomination}.
            </p>
          )}
        </Field>
      )}

      <PayoutSummary payout={payout} />

      {submitError && (
        <p className="text-error text-sm" role="alert">
          {submitError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        disabled={!canSubmit || submitting}
        className="w-full"
      >
        {submitting ? "Submitting..." : "Submit"}
      </Button>

      <ConfirmationDialog
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        description="Your submission is being verified. Once your gift card is confirmed, you'll be paid to your wallet automatically, no extra steps needed."
      />
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

function PayoutSummary({ payout }: { payout: number | null }) {
  const display = useMemo(
    () =>
      `₦${(payout ?? 0).toLocaleString("en-NG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
    [payout],
  );

  return (
    <div className="bg-secondary/50 rounded-2xl px-5 py-4">
      <p className="text-ink/50 text-xs font-medium tracking-wide uppercase">
        You&apos;ll receive
      </p>
      <p className="font-heading text-primary mt-1 text-3xl font-semibold tabular-nums">
        {display}
      </p>
      <p className="text-ink/45 mt-1.5 text-xs">
        Rates may change until your card or deposit is confirmed.
      </p>
    </div>
  );
}
