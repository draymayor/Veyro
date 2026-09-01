import type { ComponentType, SVGProps } from "react";
import {
  GiftIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/solid";
import type { TransactionHistoryItem } from "@/lib/dashboard/transaction-history";
import {
  tradeStatusInfo,
  withdrawalStatusInfo,
} from "@/lib/dashboard/trade-status";
import { StatusBadge } from "@/components/dashboard/status-badge";

function rowIcon(
  item: TransactionHistoryItem,
): ComponentType<SVGProps<SVGSVGElement>> {
  if (item.kind === "trade") {
    return item.assetType === "gift_card" ? GiftIcon : CurrencyDollarIcon;
  }
  if (item.kind === "adjustment") {
    return item.type === "credit" ? ArrowDownIcon : ArrowUpIcon;
  }
  if (item.kind === "crypto") {
    return item.type === "deposit" || item.type === "admin_credit"
      ? ArrowDownIcon
      : ArrowUpIcon;
  }
  if (item.method === "bank_transfer") return BuildingLibraryIcon;
  if (item.method === "paypal") return CreditCardIcon;
  return ArrowUpIcon;
}

// wallet_transactions (what an "adjustment" row is) is only ever written
// after the balance change already happened - there's no pending state to
// show, so it always reads as the same "Completed" success badge trade/
// withdrawal rows use for their equivalent terminal status.
// wallet_transactions and crypto_wallet_transactions rows are only ever
// written after the balance change already happened - there's no pending
// state to show for either, so both always read as "Completed".
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

// crypto_wallet_transactions rows carry a raw symbol (e.g. "BTC") in
// `currency`, not an ISO-4217 code, so Intl.NumberFormat's style:"currency"
// throws and formatAmount's catch branch falls back to a fiat-oriented
// 3-decimal default - collapsing a real balance like 0.00005 BTC to "0".
// Mirrors crypto-breakdown.tsx's formatCryptoAmount so the same figure
// reads the same amount in both places on this page.
function formatCryptoTransactionAmount(amount: number, symbol: string): string {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 8 })} ${symbol}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface TransactionHistoryListProps {
  items: TransactionHistoryItem[];
}

/**
 * "Transaction History" section on the Assets page: a merged view of
 * trades and withdrawals (docs/database-schema.md, product-rules.md rule
 * 22). Flat rows, no shadows or dividers, per design-principles.md's
 * List/Row Styling rule. Status badges go through the same StatusBadge
 * every other status pill in the app uses, so "Paid" or "Approved" always
 * reads as the same vibrant green wherever it appears.
 */
export function TransactionHistoryList({ items }: TransactionHistoryListProps) {
  return (
    <section>
      <h2 className="text-ink font-heading mb-2 text-base font-medium">
        Transaction History
      </h2>
      {items.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No transactions yet. Your trades and withdrawals will show up here.
        </p>
      ) : (
        <div className="flex flex-col">
          {items.map((item) => {
            const Icon = rowIcon(item);
            const { label, tone } = rowStatus(item);
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-2xl px-1 py-4 sm:px-2"
              >
                <span className="bg-secondary text-ink/60 flex size-10 shrink-0 items-center justify-center rounded-full">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink block truncate text-sm font-medium">
                    {item.label}
                  </span>
                  <span className="text-ink/45 block text-xs">
                    {formatDate(item.createdAt)}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-ink text-sm font-medium tabular-nums">
                    {item.kind === "crypto"
                      ? formatCryptoTransactionAmount(
                          item.amount,
                          item.currency,
                        )
                      : formatAmount(item.amount, item.currency)}
                  </span>
                  <StatusBadge label={label} tone={tone} />
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
