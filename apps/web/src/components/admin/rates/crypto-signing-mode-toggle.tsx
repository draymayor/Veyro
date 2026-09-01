"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api-client";
import { ToggleSwitch } from "@/components/settings/toggle-switch";

export type CryptoWithdrawalSigningMode = "manual" | "automatic";

/**
 * platform_settings.crypto_withdrawal_signing_mode
 * (docs/database-schema.md's Withdrawal signing mode section): default
 * 'manual', meaning a crypto withdrawal that reaches 'processing' still
 * needs an explicit admin approve-for-signing action before anything
 * signs/broadcasts. Flipping to 'automatic' removes that human step. This
 * is a separate axis from the Require Approval toggle on the Withdrawals
 * page (that one gates whether the REQUEST needs review before proceeding
 * at all) - same ToggleSwitch pattern as that toggle, just a different
 * setting and a different page.
 *
 * No automated signer exists yet regardless of this toggle's value
 * (consolidation wallet keys aren't provisioned in Secret Manager) - this
 * only controls how far a withdrawal gets in the DB-level gate, see the
 * "Ready to sign" badge on the Withdrawals page for what that means today.
 */
export function CryptoSigningModeToggle({
  initialSigningMode,
}: {
  initialSigningMode: CryptoWithdrawalSigningMode;
}) {
  const router = useRouter();
  const [signingMode, setSigningMode] = useState(initialSigningMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAutomatic = signingMode === "automatic";

  async function handleToggle(next: boolean) {
    const nextMode: CryptoWithdrawalSigningMode = next ? "automatic" : "manual";
    setError(null);
    setSaving(true);
    try {
      await authFetch("/admin/rates/crypto-signing-mode", {
        method: "POST",
        body: JSON.stringify({ signingMode: nextMode }),
      });
      setSigningMode(nextMode);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update this setting.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-border bg-card flex flex-col gap-1 rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="text-ink flex items-center gap-2 text-sm font-medium">
            Automatic crypto withdrawal signing
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                isAutomatic
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-ink/50"
              }`}
            >
              {isAutomatic ? "Automatic" : "Manual"}
            </span>
          </span>
          <span className="text-ink/50 block text-xs">
            {isAutomatic
              ? "Crypto withdrawals that reach processing are queued for signing immediately, no admin step. Turn this off to require an explicit approval before any withdrawal is released for signing."
              : "Manual by default: a crypto withdrawal that reaches processing sits pending an explicit admin approval before it's released for signing. Turn this on to remove that human step."}
          </span>
        </span>
        <ToggleSwitch
          checked={isAutomatic}
          onCheckedChange={handleToggle}
          disabled={saving}
          label="Automatic crypto withdrawal signing"
        />
      </div>
      {error ? <p className="text-error text-xs">{error}</p> : null}
    </div>
  );
}
