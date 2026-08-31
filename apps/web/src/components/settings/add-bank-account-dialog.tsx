"use client";

import { useState } from "react";
import {
  SettingsDialog,
  SettingsField,
  SETTINGS_FIELD_CLASS,
} from "@/components/settings/settings-dialog";
import { Button } from "@/components/ui/button";
import { CountrySelect } from "@/components/auth/country-select";
import { findCountry } from "@/lib/countries";
import { authFetch } from "@/lib/api-client";
import {
  fieldSetForCountry,
  fieldsForSet,
  type BankFieldDef,
} from "@/lib/settings/bank-fields";
import type { BankAccount } from "@/lib/settings/bank-accounts";

interface AddBankAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (account: BankAccount) => void;
}

type Step = "country" | "details";

/**
 * Country decides the field set before anything else is asked, per
 * docs/product-rules.md rule 19: this is a real conditional form, not one
 * template with relabeled fields. Radix unmounts Dialog.Content when
 * closed, so this remounts fresh each time it opens, no effect needed to
 * reset the draft.
 */
export function AddBankAccountDialog({
  open,
  onOpenChange,
  onAdded,
}: AddBankAccountDialogProps) {
  const [step, setStep] = useState<Step>("country");
  const [countryCode, setCountryCode] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldSet = countryCode ? fieldSetForCountry(countryCode) : null;
  const fields = fieldSet ? fieldsForSet(fieldSet) : [];

  function handleOpenChange(next: boolean) {
    if (!next) {
      setStep("country");
      setCountryCode("");
      setValues({});
      setError(null);
    }
    onOpenChange(next);
  }

  function handleContinue() {
    if (!countryCode) {
      setError("Select a country.");
      return;
    }
    setError(null);
    setValues({});
    setStep("details");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const account = await authFetch<BankAccount>("/bank-accounts", {
        method: "POST",
        body: JSON.stringify({ country: countryCode, bankDetails: values }),
      });
      onAdded(account);
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const countryName = countryCode ? findCountry(countryCode)?.name : undefined;

  return (
    <SettingsDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Add Bank Account"
    >
      {step === "country" ? (
        <div className="flex flex-col gap-4">
          <SettingsField label="Country">
            <CountrySelect value={countryCode} onChange={setCountryCode} />
          </SettingsField>
          {error ? <p className="text-error text-sm">{error}</p> : null}
          <Button
            type="button"
            size="lg"
            className="mt-1 w-full"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setStep("country")}
            className="text-primary -mt-1 self-start text-xs font-medium hover:underline"
          >
            &larr; {countryName ?? "Change country"}
          </button>
          {fields.map((field) => (
            <BankField
              key={field.key}
              field={field}
              value={values[field.key] ?? ""}
              onChange={(v) =>
                setValues((prev) => ({ ...prev, [field.key]: v }))
              }
            />
          ))}
          {error ? <p className="text-error text-sm">{error}</p> : null}
          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="mt-1 w-full"
          >
            {submitting ? "Saving..." : "Save Bank Account"}
          </Button>
        </form>
      )}
    </SettingsDialog>
  );
}

function BankField({
  field,
  value,
  onChange,
}: {
  field: BankFieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "select") {
    return (
      <SettingsField label={field.label}>
        <select
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={SETTINGS_FIELD_CLASS}
        >
          <option value="" disabled>
            {field.placeholder}
          </option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option === "checking" || option === "savings"
                ? option[0].toUpperCase() + option.slice(1)
                : option}
            </option>
          ))}
        </select>
      </SettingsField>
    );
  }

  return (
    <SettingsField label={field.label}>
      <input
        type="text"
        required
        inputMode={field.inputMode === "numeric" ? "numeric" : "text"}
        maxLength={field.maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={SETTINGS_FIELD_CLASS}
      />
    </SettingsField>
  );
}
