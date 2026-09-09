import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatMoney, formatDateTime } from "@/lib/admin/withdrawals/display";
import { withdrawalUserLabel } from "@/lib/admin/withdrawals/display";
import type {
  AdminEarnClaimListItem,
  AdminEarnClaimStatus,
} from "@/lib/admin/earn-claims/types";

const STATUS_INFO: Record<
  AdminEarnClaimStatus,
  { label: string; tone: "success" | "neutral" | "error" }
> = {
  claimed: { label: "Claimed", tone: "neutral" },
  unlocked: { label: "Unlocked", tone: "success" },
  paid: { label: "Paid", tone: "success" },
  expired: { label: "Expired", tone: "error" },
};

/** One row in the admin Earn Bonus Claims monitoring view. Read-only - all
 * state changes happen server-side via EarnService, never from here. */
export function EarnClaimRow({ claim }: { claim: AdminEarnClaimListItem }) {
  const { label, tone } = STATUS_INFO[claim.status];

  return (
    <div className="border-border flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink text-sm font-medium">
            {withdrawalUserLabel(claim.user_display_name, claim.user_id)}
          </p>
          <p className="text-ink/50 text-xs">
            Claimed {formatDateTime(claim.claimed_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-ink text-sm font-medium tabular-nums">
            {formatMoney(claim.bonus_amount_usd, "USD")}
          </span>
          <StatusBadge label={label} tone={tone} />
        </div>
      </div>

      <div className="bg-secondary flex flex-col gap-1 rounded-xl px-3 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <span className="text-ink/50 text-xs">Required trade volume</span>
          <span className="text-ink text-right text-xs font-medium">
            {formatMoney(claim.required_trade_volume_usd, "USD")}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-ink/50 text-xs">Expires</span>
          <span className="text-ink text-right text-xs font-medium">
            {formatDateTime(claim.expires_at)}
          </span>
        </div>
        {claim.unlocked_at ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink/50 text-xs">Unlocked</span>
            <span className="text-ink text-right text-xs font-medium">
              {formatDateTime(claim.unlocked_at)}
            </span>
          </div>
        ) : null}
        {claim.paid_at ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink/50 text-xs">Paid</span>
            <span className="text-ink text-right text-xs font-medium">
              {formatDateTime(claim.paid_at)}
            </span>
          </div>
        ) : null}
        {claim.wallet_transaction_id ? (
          <div className="flex items-center justify-between gap-4">
            <span className="text-ink/50 text-xs">Wallet transaction</span>
            <span className="text-ink text-right font-mono text-xs font-medium break-all">
              {claim.wallet_transaction_id}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
