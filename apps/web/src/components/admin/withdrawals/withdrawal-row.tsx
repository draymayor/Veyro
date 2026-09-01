import { StatusBadge } from "@/components/dashboard/status-badge";
import { withdrawalStatusInfo } from "@/lib/dashboard/trade-status";
import {
  withdrawalUserLabel,
  formatMoney,
  formatDateTime,
  bankDetailEntries,
} from "@/lib/admin/withdrawals/display";
import { WithdrawalActions } from "./withdrawal-actions";
import { SuspendWithdrawalsButton } from "@/components/admin/users/suspend-withdrawals-button";
import type { AdminWithdrawalListItem } from "@/lib/admin/withdrawals/types";

function methodLabel(method: AdminWithdrawalListItem["method"]): string {
  if (method === "bank_transfer") return "Bank Transfer";
  if (method === "paypal") return "PayPal";
  return "Crypto";
}

/**
 * One Payout Processing queue card (docs/admin-guide.md): unlike Trade
 * Review, there's no separate detail route, everything the admin needs to
 * process the payout (method-specific payout destination included) shows
 * right in the queue.
 */
export function WithdrawalRow({
  withdrawal,
}: {
  withdrawal: AdminWithdrawalListItem;
}) {
  const { label, tone } = withdrawalStatusInfo(withdrawal.status);

  return (
    <div className="border-border flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-ink text-sm font-medium">
            {withdrawalUserLabel(
              withdrawal.user_display_name,
              withdrawal.user_id,
            )}
          </p>
          <p className="text-ink/50 text-xs">
            {methodLabel(withdrawal.method)} ·{" "}
            {formatDateTime(withdrawal.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-ink text-sm font-medium tabular-nums">
            {formatMoney(withdrawal.amount, withdrawal.currency)}
          </span>
          <StatusBadge label={label} tone={tone} />
        </div>
      </div>

      <SuspendWithdrawalsButton
        userId={withdrawal.user_id}
        suspended={withdrawal.user_withdrawals_suspended}
      />

      <PayoutDestination withdrawal={withdrawal} />

      {withdrawal.transaction_reference ? (
        <p className="text-ink/50 text-xs">
          Reference:{" "}
          <span className="text-ink font-mono">
            {withdrawal.transaction_reference}
          </span>
        </p>
      ) : null}

      <WithdrawalActions
        withdrawalId={withdrawal.id}
        status={withdrawal.status}
        cryptoSigningStatus={withdrawal.crypto_signing_status}
      />
    </div>
  );
}

function PayoutDestination({
  withdrawal,
}: {
  withdrawal: AdminWithdrawalListItem;
}) {
  if (withdrawal.method === "bank_transfer") {
    const entries = bankDetailEntries(withdrawal.bank_details);
    if (entries.length === 0) {
      return (
        <p className="text-ink/50 text-sm">No bank account details on file.</p>
      );
    }
    return (
      <div className="bg-secondary flex flex-col gap-1 rounded-xl px-3 py-2.5">
        {entries.map((entry) => (
          <div
            key={entry.label}
            className="flex items-center justify-between gap-4"
          >
            <span className="text-ink/50 text-xs">{entry.label}</span>
            <span className="text-ink text-right text-xs font-medium break-all">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (withdrawal.method === "paypal") {
    return (
      <div className="bg-secondary flex items-center justify-between gap-4 rounded-xl px-3 py-2.5">
        <span className="text-ink/50 text-xs">PayPal email</span>
        <span className="text-ink text-right text-xs font-medium break-all">
          {withdrawal.paypal_email ?? "-"}
        </span>
      </div>
    );
  }

  return (
    <div className="bg-secondary flex flex-col gap-1 rounded-xl px-3 py-2.5">
      <div className="flex items-center justify-between gap-4">
        <span className="text-ink/50 text-xs">Asset</span>
        <span className="text-ink text-right text-xs font-medium">
          {withdrawal.crypto_asset_symbol ?? "-"} ·{" "}
          {withdrawal.crypto_asset_network ?? "-"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-ink/50 text-xs">Destination address</span>
        <span className="text-ink text-right text-xs font-medium break-all">
          {withdrawal.crypto_payout_address ?? "-"}
        </span>
      </div>
    </div>
  );
}
