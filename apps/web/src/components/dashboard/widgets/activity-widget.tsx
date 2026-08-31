import {
  tradeStatusInfo,
  withdrawalStatusInfo,
} from "@/lib/dashboard/trade-status";
import type { TransactionHistoryItem } from "@/lib/dashboard/transaction-history";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { WidgetShell } from "./widget-shell";

interface ActivityWidgetProps {
  items: TransactionHistoryItem[];
}

// See transaction-history-list.tsx's rowStatus for why "adjustment" always
// reads as "Completed": a wallet_transactions row is only ever written
// after the balance change already happened, there's no pending state.
function rowStatus(item: TransactionHistoryItem) {
  if (item.kind === "trade") return tradeStatusInfo(item.status);
  if (item.kind === "withdrawal") return withdrawalStatusInfo(item.status);
  return { label: "Completed", tone: "success" as const };
}

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-US")}`;
  }
}

export function ActivityWidget({ items }: ActivityWidgetProps) {
  return (
    <WidgetShell title="Recent Activity" href="/assets">
      {items.length === 0 ? (
        <p className="text-ink/45 text-xs">
          No activity yet. Your trades and withdrawals will show up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.slice(0, 2).map((item) => {
            const { label, tone } = rowStatus(item);
            return (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-ink truncate text-xs font-medium">
                    {item.label}
                  </p>
                  <p className="text-ink/50 text-xs tabular-nums">
                    {formatAmount(item.amount, item.currency)}
                  </p>
                </div>
                <StatusBadge label={label} tone={tone} />
              </li>
            );
          })}
        </ul>
      )}
    </WidgetShell>
  );
}
