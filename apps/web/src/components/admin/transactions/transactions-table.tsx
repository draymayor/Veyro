import Link from "next/link";
import {
  transactionUserLabel,
  formatTransactionAmount,
  formatMoney,
  formatCrypto,
  formatDateTime,
  sourceLabel,
  sourceReference,
} from "@/lib/admin/transactions/display";
import type { AdminTransactionListItem } from "@/lib/admin/transactions/types";

interface TransactionsTableProps {
  transactions: AdminTransactionListItem[];
}

// The ledger table for the All Transactions View (docs/admin-guide.md):
// every wallet_transactions (fiat) and crypto_wallet_transactions (crypto)
// row, credit or debit, trade-triggered, withdrawal-triggered, a standalone
// manual deposit/adjustment, or a crypto deposit - merged into one feed so
// admin sees the full ledger, not just fiat. balance_after is rendered as
// stored on the row (docs/database-schema.md: "a running balance snapshot
// for audit"), never recomputed here. Purely read-only - no approve/reject
// controls anywhere on this table, those stay on Trade Review and Payout
// Processing.
export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <div className="border-border overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead>
          <tr className="border-border text-ink/45 border-b text-xs font-medium">
            <th className="px-3 py-2 font-medium">Date</th>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Ledger</th>
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 text-right font-medium">Balance after</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionRow({
  transaction,
}: {
  transaction: AdminTransactionListItem;
}) {
  return (
    <tr className="border-border/60 border-b align-top last:border-0">
      <td className="text-ink/70 px-3 py-2.5 whitespace-nowrap">
        {formatDateTime(transaction.created_at)}
      </td>
      <td className="px-3 py-2.5">
        <Link
          href={`/admin/users/${transaction.user_id}`}
          className="text-ink text-sm font-medium hover:underline"
        >
          {transactionUserLabel(
            transaction.user_display_name,
            transaction.user_id,
          )}
        </Link>
        {transaction.user_email ? (
          <p className="text-ink/45 text-xs">{transaction.user_email}</p>
        ) : null}
      </td>
      <td className="px-3 py-2.5">
        <span className="text-ink/70 text-xs font-medium">
          {transaction.ledger === "crypto" ? "Crypto" : "Fiat"}
        </span>
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            transaction.type === "credit"
              ? "bg-success/15 text-success"
              : "bg-error/15 text-error"
          }`}
        >
          {transaction.type === "credit" ? "Credit" : "Debit"}
        </span>
      </td>
      <td className="text-ink px-3 py-2.5 font-medium whitespace-nowrap tabular-nums">
        {transaction.type === "debit" ? "-" : ""}
        {formatTransactionAmount(transaction)}
      </td>
      <td className="px-3 py-2.5">
        {transaction.source === "trade" && transaction.trade_id ? (
          <Link
            href={`/admin/trades/${transaction.trade_id}`}
            className="text-ink text-sm font-medium hover:underline"
          >
            {sourceLabel(transaction)}
          </Link>
        ) : (
          <span className="text-ink text-sm font-medium">
            {sourceLabel(transaction)}
          </span>
        )}
        <p
          className="text-ink/45 max-w-[280px] truncate text-xs"
          title={sourceReference(transaction)}
        >
          {sourceReference(transaction)}
        </p>
      </td>
      <td className="text-ink/70 px-3 py-2.5 text-right whitespace-nowrap tabular-nums">
        {transaction.ledger === "crypto"
          ? formatCrypto(
              transaction.balance_after,
              transaction.crypto_symbol ?? "",
            )
          : formatMoney(transaction.balance_after, transaction.currency)}
      </td>
    </tr>
  );
}
