"use client";

import { useState } from "react";
import { CreditCardIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { PaypalEmailDialog } from "@/components/settings/paypal-email-dialog";
import { BankAccountsList } from "@/components/settings/bank-accounts-list";
import { SAVED_PAYPAL_EMAIL } from "@/lib/settings/data";

const CHEVRON = (
  <ChevronRightIcon className="text-ink/30 size-4" aria-hidden="true" />
);

/**
 * Where users manage the payout details later used at withdrawal time
 * (docs/context.md), not a withdrawal flow itself. No crypto payout
 * address field here: crypto withdrawal already happens through the
 * Withdraw button under the wallet balance, so a separately saved address
 * here would be redundant. Bank Transfer is real, multi-account,
 * country-conditional data (see BankAccountsList); PayPal stays local
 * state only until a real backend write is wired in for it too.
 */
export function PaymentMethodsSection() {
  const [paypalEmail, setPaypalEmail] = useState(SAVED_PAYPAL_EMAIL);
  const [paypalDialogOpen, setPaypalDialogOpen] = useState(false);

  return (
    <SettingsSection
      title="Payment Methods"
      description="Manage the payout details used when you withdraw."
    >
      <BankAccountsList />
      <SettingsRow
        icon={CreditCardIcon}
        label="PayPal"
        description={paypalEmail ?? "Not added yet"}
        onClick={() => setPaypalDialogOpen(true)}
        right={CHEVRON}
      />

      <PaypalEmailDialog
        open={paypalDialogOpen}
        onOpenChange={setPaypalDialogOpen}
        value={paypalEmail}
        onSave={setPaypalEmail}
      />
    </SettingsSection>
  );
}
