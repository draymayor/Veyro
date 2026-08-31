import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminTransactionListItem } from "@/lib/admin/transactions/types";
import type { AdminUserListItem } from "@/lib/admin/users/types";
import { TransactionFilters } from "@/components/admin/transactions/transaction-filters";
import { TransactionsTable } from "@/components/admin/transactions/transactions-table";

interface PageProps {
  searchParams: Promise<{
    userId?: string;
    type?: string;
    source?: string;
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
  }>;
}

// All Transactions View (docs/admin-guide.md): every wallet_transactions
// row platform-wide, the ledger and single source of truth for every
// credit/debit, filterable by user/type/source/date range. Distinct from
// the Trade Review and Payout Processing queues (action-oriented, scoped
// to pending items) - this is oversight and lookup of everything,
// completed or not, and carries no approve/reject actions.
//
// CSV export is skipped: the list here is unpaginated (matching every
// other admin list endpoint in this codebase), so a full-ledger export
// would need streaming or pagination infrastructure that doesn't exist
// yet anywhere in admin. Worth adding once the underlying list endpoints
// grow pagination generally, not a one-off for this page alone.
export default async function AdminTransactionsPage({
  searchParams,
}: PageProps) {
  const { userId, type, source, dateFrom, dateTo, sort } = await searchParams;

  const query = new URLSearchParams();
  if (userId) query.set("userId", userId);
  if (type) query.set("type", type);
  if (source) query.set("source", source);
  if (dateFrom) query.set("dateFrom", dateFrom);
  if (dateTo) query.set("dateTo", dateTo);
  if (sort) query.set("sort", sort);
  const queryString = query.toString();

  const [transactions, selectedUserResults] = await Promise.all([
    adminFetch<AdminTransactionListItem[]>(
      `/admin/transactions${queryString ? `?${queryString}` : ""}`,
    ),
    userId
      ? adminFetch<AdminUserListItem[]>(
          `/admin/users?search=${encodeURIComponent(userId)}`,
        )
      : Promise.resolve(null),
  ]);

  const initialSelectedUser =
    selectedUserResults?.find((user) => user.id === userId) ?? null;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          All Transactions
        </h1>
      </div>

      <TransactionFilters initialSelectedUser={initialSelectedUser} />

      {transactions === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load transactions. Try refreshing the page.
        </p>
      ) : transactions.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No transactions match these filters.
        </p>
      ) : (
        <TransactionsTable transactions={transactions} />
      )}
    </div>
  );
}
