"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api-client";
import { ToggleSwitch } from "@/components/settings/toggle-switch";

export type DepositAddressMode = "automatic" | "manual";

const WARNING_TEXT =
  "Only use manual mode before real users exist. Switching this on with real users active means deposits cannot be correctly attributed to individual users.";

/**
 * platform_settings.deposit_address_mode: default 'automatic', meaning
 * Deposit Crypto hands each user their own real generated address
 * (CryptoAddressesService.getOrCreateAddress). Flipping to 'manual' makes
 * every user see the same admin-set crypto_assets.deposit_address for that
 * asset/network instead - a pre-launch-only escape hatch (e.g. testing a
 * payout flow before real per-user derivation is fully wired up), never
 * safe to run once real users can deposit. Same ToggleSwitch pattern as
 * CryptoSigningModeToggle, plus a hard-to-miss warning banner and a
 * confirmation step before turning manual mode on, since the failure mode
 * here is real user funds landing at an address that can't be attributed to
 * them.
 */
export function DepositAddressModeToggle({
  initialMode,
}: {
  initialMode: DepositAddressMode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isManual = mode === "manual";

  async function handleToggle(next: boolean) {
    const nextMode: DepositAddressMode = next ? "manual" : "automatic";

    if (
      nextMode === "manual" &&
      !window.confirm(
        `${WARNING_TEXT}\n\nAre you sure you want to switch deposit addresses to manual mode?`,
      )
    ) {
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await authFetch("/admin/rates/deposit-address-mode", {
        method: "POST",
        body: JSON.stringify({ depositAddressMode: nextMode }),
      });
      setMode(nextMode);
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
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${
        isManual ? "border-error bg-error/10" : "border-error/40 bg-error/5"
      }`}
    >
      <div className="border-error/50 bg-error/15 flex items-start gap-2 rounded-xl border px-3 py-2">
        <span aria-hidden className="text-error text-base leading-none">
          ⚠
        </span>
        <p className="text-error text-xs leading-snug font-semibold">
          {WARNING_TEXT}
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <span className="min-w-0">
          <span className="text-ink flex items-center gap-2 text-sm font-medium">
            Deposit address mode
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                isManual
                  ? "bg-error/20 text-error"
                  : "bg-primary/15 text-primary"
              }`}
            >
              {isManual ? "MANUAL - FALLBACK ADDRESS" : "Automatic"}
            </span>
          </span>
          <span className="text-ink/50 block text-xs">
            {isManual
              ? "Every user currently sees the same admin-set fallback address per asset/network (crypto_assets.deposit_address), not their own real one."
              : "Automatic by default: Deposit Crypto generates and returns each user's own real per-user address."}
          </span>
        </span>
        <ToggleSwitch
          checked={isManual}
          onCheckedChange={handleToggle}
          disabled={saving}
          label="Manual deposit address mode"
        />
      </div>
      {error ? <p className="text-error text-xs">{error}</p> : null}
    </div>
  );
}
