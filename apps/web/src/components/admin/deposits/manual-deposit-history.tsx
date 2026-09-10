import { userLabel, formatMoney } from "@/lib/admin/users/display";
import { formatDateTime } from "@/lib/admin/withdrawals/display";
import type { ManualDepositHistoryItem } from "@/lib/admin/deposits/types";

function formatCredited(item: ManualDepositHistoryItem): string {
  if (item.amount === null) return "-";
  return item.depositType === "fiat"
    ? formatMoney(item.amount, item.walletCurrency ?? "USD")
    : `${item.amount} ${item.symbol ?? ""}`.trim();
}

function adminLabel(item: ManualDepositHistoryItem): string {
  return item.adminDisplayName ?? `Admin ${item.adminId.slice(0, 8)}`;
}

/**
 * Manual Deposit history (visible audit trail once there's more than one
 * admin): reads the same admin_actions rows execute() already writes, not a
 * new table. Each row is a completed credit, there's nothing to action here.
 */
export function ManualDepositHistory({
  history,
}: {
  history: ManualDepositHistoryItem[] | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-ink text-sm font-semibold sm:text-base">
        Manual deposit history
      </h2>

      {history === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load deposit history. Try refreshing the page.
        </p>
      ) : history.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No manual deposits have been credited yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {history.map((item) => (
            <div
              key={item.actionId}
              className="border-border flex flex-col gap-2 rounded-2xl border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-medium">
                    {item.userId
                      ? userLabel(item.userDisplayName, item.userId)
                      : "Unknown user"}
                  </p>
                  <p className="text-ink/50 text-xs">
                    {formatDateTime(item.createdAt)} · by {adminLabel(item)}
                  </p>
                </div>
                <span className="text-ink text-sm font-medium tabular-nums">
                  {formatCredited(item)}
                </span>
              </div>

              {item.reason ? (
                <p className="text-ink/60 text-sm">{item.reason}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
