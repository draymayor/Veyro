"use client";

import { useEffect, useState } from "react";
import {
  KeyIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/solid";
import { SettingsSection } from "@/components/settings/settings-section";
import { SettingsRow } from "@/components/settings/settings-row";
import { ChangePasswordDialog } from "@/components/settings/change-password-dialog";
import { EnrollTotpDialog } from "@/components/settings/enroll-totp-dialog";
import { DisableTotpDialog } from "@/components/settings/disable-totp-dialog";
import { GoogleIcon } from "@/components/auth/google-icon";
import { createClient } from "@/lib/supabase/client";

interface SecuritySectionProps {
  /** From user.app_metadata.provider (see AppLayout), "google" or "email". */
  provider: string;
}

/**
 * TOTP here is account-recovery only (docs/product-rules.md rule 18a), never
 * used for withdrawals, that's the separate WithdrawalPinSection below it on
 * the page. Enrollment status comes from supabase.auth.mfa.listFactors()
 * directly, no backend round trip needed for that part.
 */
export function SecuritySection({ provider }: SecuritySectionProps) {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const isGoogleAccount = provider === "google";

  async function refreshFactorStatus() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === "verified");
    setFactorId(verified?.id ?? null);
    setLoading(false);
  }

  useEffect(() => {
    async function load() {
      await refreshFactorStatus();
    }
    void load();
  }, []);

  const enrolled = !!factorId;

  return (
    <SettingsSection title="Security">
      {isGoogleAccount ? (
        <SettingsRow
          icon={GoogleIcon}
          label="Password"
          description="Managed by Google"
          right={
            <span className="text-ink/40 text-xs">Signed in with Google</span>
          }
        />
      ) : (
        <SettingsRow
          icon={KeyIcon}
          label="Change Password"
          onClick={() => setPasswordDialogOpen(true)}
          right={
            <ChevronRightIcon
              className="text-ink/30 size-4"
              aria-hidden="true"
            />
          }
        />
      )}
      <SettingsRow
        icon={ShieldCheckIcon}
        label="Two-Factor Authentication"
        description={
          loading
            ? "Checking..."
            : enrolled
              ? "Enabled for account recovery at login."
              : "Add a backup layer for account recovery."
        }
        onClick={() =>
          enrolled ? setDisableDialogOpen(true) : setEnrollDialogOpen(true)
        }
        disabled={loading}
        right={
          enrolled ? (
            <span className="text-success bg-success/10 rounded-full px-2.5 py-1 text-xs font-medium">
              Enabled
            </span>
          ) : (
            <ChevronRightIcon
              className="text-ink/30 size-4"
              aria-hidden="true"
            />
          )
        }
      />

      {!isGoogleAccount ? (
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
        />
      ) : null}

      <EnrollTotpDialog
        open={enrollDialogOpen}
        onOpenChange={setEnrollDialogOpen}
        onEnrolled={refreshFactorStatus}
      />

      {factorId ? (
        <DisableTotpDialog
          open={disableDialogOpen}
          onOpenChange={setDisableDialogOpen}
          factorId={factorId}
          onDisabled={refreshFactorStatus}
        />
      ) : null}
    </SettingsSection>
  );
}
