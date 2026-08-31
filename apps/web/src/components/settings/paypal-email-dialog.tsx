"use client";

import { useState } from "react";
import {
  SettingsDialog,
  SettingsField,
  SETTINGS_FIELD_CLASS,
} from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";

interface PaypalEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string | null;
  onSave: (value: string) => void;
}

/** Editable PayPal payout email, saved locally for now (see SettingsDialog for the shared shell this and BankAccountsList's add form both use). */
export function PaypalEmailDialog({
  open,
  onOpenChange,
  value,
  onSave,
}: PaypalEmailDialogProps) {
  const [draft, setDraft] = useState(() => value ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(draft);
    onOpenChange(false);
  }

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      title="PayPal Email"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <SettingsField label="PayPal Email">
          <input
            type="email"
            required
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="you@example.com"
            className={SETTINGS_FIELD_CLASS}
          />
        </SettingsField>
        <Button type="submit" size="lg" className="mt-1 w-full">
          Save PayPal Email
        </Button>
      </form>
    </SettingsDialog>
  );
}
