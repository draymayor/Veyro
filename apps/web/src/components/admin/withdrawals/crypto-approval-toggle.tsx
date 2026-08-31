"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/api-client";
import { ToggleSwitch } from "@/components/settings/toggle-switch";

/**
 * platform_settings.crypto_withdrawal_requires_approval
 * (docs/admin-guide.md, product-rules.md rule 18b): default off, meaning
 * crypto withdrawals skip straight to processing. Flipping this on sends
 * new crypto withdrawals through the same requested-first queue as
 * bank/PayPal instead, reversible any time. Uses the exact same
 * ToggleSwitch the consumer Settings page's Notifications section
 * renders through, not a separately-styled lookalike.
 */
export function CryptoApprovalToggle({
  initialRequiresApproval,
}: {
  initialRequiresApproval: boolean;
}) {
  const router = useRouter();
  const [requiresApproval, setRequiresApproval] = useState(
    initialRequiresApproval,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(next: boolean) {
    setError(null);
    setSaving(true);
    try {
      await authFetch("/admin/withdrawals/settings", {
        method: "POST",
        body: JSON.stringify({ cryptoWithdrawalRequiresApproval: next }),
      });
      setRequiresApproval(next);
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
            Require approval for crypto withdrawals
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                requiresApproval
                  ? "bg-primary/15 text-primary"
                  : "bg-secondary text-ink/50"
              }`}
            >
              {requiresApproval ? "On" : "Off"}
            </span>
          </span>
          <span className="text-ink/50 block text-xs">
            {requiresApproval
              ? "Crypto withdrawals now require admin approval before processing, the same requested-first review bank/PayPal already goes through. Turn this off to return to automatic processing."
              : "Off by default: crypto withdrawals go straight to processing since the user already supplied their own destination address and passed PIN verification. Turn this on to require the same requested-first review as bank/PayPal."}
          </span>
        </span>
        <ToggleSwitch
          checked={requiresApproval}
          onCheckedChange={handleToggle}
          disabled={saving}
          label="Require approval for crypto withdrawals"
        />
      </div>
      {error ? <p className="text-error text-xs">{error}</p> : null}
    </div>
  );
}
