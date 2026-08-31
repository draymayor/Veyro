"use client";

import { useState } from "react";
import { LockClosedIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { WithdrawalPinDialog } from "@/components/settings/withdrawal-pin-dialog";
import { ForgotPinDialog } from "@/components/settings/forgot-pin-dialog";

interface WithdrawalPinSectionProps {
  initialIsSet: boolean;
}

/**
 * Deliberately its own section, separate from Security's TOTP row
 * (docs/product-rules.md rule 18a): this PIN is required before every
 * withdrawal for every user regardless of TOTP status, not an
 * account-recovery mechanism.
 */
export function WithdrawalPinSection({
  initialIsSet,
}: WithdrawalPinSectionProps) {
  const [isSet, setIsSet] = useState(initialIsSet);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [forgotDialogOpen, setForgotDialogOpen] = useState(false);

  return (
    <SettingsSection
      title="Withdrawal PIN"
      description="Confirms every withdrawal, separate from your password and two-factor authentication."
    >
      <SettingsRow
        icon={LockClosedIcon}
        label={isSet ? "Withdrawal PIN" : "Set Withdrawal PIN"}
        description={isSet ? "•••• is set" : "Required before you can withdraw"}
        onClick={() => setPinDialogOpen(true)}
        right={
          <ChevronRightIcon className="text-ink/30 size-4" aria-hidden="true" />
        }
      />

      <WithdrawalPinDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        mode={isSet ? "change" : "setup"}
        onSaved={() => setIsSet(true)}
        onForgotPin={() => setForgotDialogOpen(true)}
      />

      <ForgotPinDialog
        open={forgotDialogOpen}
        onOpenChange={setForgotDialogOpen}
        onReset={() => setIsSet(true)}
      />
    </SettingsSection>
  );
}
