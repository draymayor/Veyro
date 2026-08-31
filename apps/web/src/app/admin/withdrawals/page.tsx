import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminWithdrawalListItem } from "@/lib/admin/withdrawals/types";
import { WithdrawalFilters } from "@/components/admin/withdrawals/withdrawal-filters";
import { WithdrawalRow } from "@/components/admin/withdrawals/withdrawal-row";
import { CryptoApprovalToggle } from "@/components/admin/withdrawals/crypto-approval-toggle";

interface PageProps {
  searchParams: Promise<{ status?: string; method?: string }>;
}

interface WithdrawalSettings {
  cryptoWithdrawalRequiresApproval: boolean;
}

// Payout Processing queue (docs/admin-guide.md): all payouts are manual in
// V1, filterable by status and method, backed by real GET /admin/withdrawals
// queries. adminFetch returns null on a request failure (bad response),
// distinct from a real empty result (data === []), so the two never get
// the same "couldn't load" message.
export default async function AdminWithdrawalsPage({
  searchParams,
}: PageProps) {
  const { status, method } = await searchParams;

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (method) query.set("method", method);
  const queryString = query.toString();

  const [withdrawals, settings] = await Promise.all([
    adminFetch<AdminWithdrawalListItem[]>(
      `/admin/withdrawals${queryString ? `?${queryString}` : ""}`,
    ),
    adminFetch<WithdrawalSettings>("/admin/withdrawals/settings"),
  ]);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          Payout Processing
        </h1>
        <WithdrawalFilters />
      </div>

      <CryptoApprovalToggle
        initialRequiresApproval={
          settings?.cryptoWithdrawalRequiresApproval ?? false
        }
      />

      {withdrawals === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load withdrawals. Try refreshing the page.
        </p>
      ) : withdrawals.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No withdrawal requests match these filters.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {withdrawals.map((withdrawal) => (
            <WithdrawalRow key={withdrawal.id} withdrawal={withdrawal} />
          ))}
        </div>
      )}
    </div>
  );
}
