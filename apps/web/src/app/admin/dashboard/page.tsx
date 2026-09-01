import { adminFetch } from "@/lib/admin/admin-fetch";
import {
  formatCurrencyTotals,
  type AdminDashboardMetrics,
} from "@/lib/admin/dashboard-metrics";
import { MetricCard } from "@/components/admin/dashboard/metric-card";
import { NotificationsPanel } from "@/components/admin/dashboard/notifications-panel";
import { CryptoBreakdownDropdown } from "@/components/admin/dashboard/crypto-breakdown-dropdown";

function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

// Dashboard home (docs/admin-guide.md): top-level metrics + admin
// notifications panel, all backed by real queries against GET
// /admin/dashboard (apps/api/src/admin/dashboard). Revenue/profit isn't
// tracked yet (no liquidation-value data exists to compute the spread
// against quoted_payout), so it's shown as a clear "not yet available"
// state rather than a fabricated number.
export default async function AdminDashboardPage() {
  const metrics = await adminFetch<AdminDashboardMetrics>("/admin/dashboard");

  if (!metrics) {
    return (
      <div>
        <h1 className="font-heading text-ink text-xl font-semibold">
          Dashboard
        </h1>
        <p className="text-ink/60 mt-4 text-sm">
          Couldn&apos;t load dashboard metrics. Try refreshing the page.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5 sm:gap-6">
      <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
        Dashboard
      </h1>

      {/* 2-up on mobile, 4-up from md and up: 7 cards means the last row
          of the desktop grid has 3 (fine, standard grid wrap behavior). */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <MetricCard
          label="Total users"
          value={metrics.totalUsers.toLocaleString("en-US")}
        />
        <MetricCard
          label="Today's trades"
          value={metrics.todaysTrades.toLocaleString("en-US")}
        />
        <MetricCard
          label="Pending trades"
          value={metrics.pendingTrades.toLocaleString("en-US")}
        />
        <MetricCard
          label="Today's trading volume"
          value={formatCurrencyTotals(metrics.todaysVolumeByCurrency)}
        />
        <MetricCard
          label="Wallet liabilities"
          value={formatCurrencyTotals(metrics.walletLiabilitiesByCurrency)}
          caption="Total owed across every user wallet, by currency"
        />
        <MetricCard
          label="Wallet liabilities (combined)"
          value={
            metrics.walletLiabilitiesCombinedUsd === null
              ? "Unavailable"
              : formatUsd(metrics.walletLiabilitiesCombinedUsd)
          }
          caption="Fiat + crypto held, converted to one USD figure"
        />
        <MetricCard
          label="Total crypto trades"
          value={metrics.totalCryptoTrades.toLocaleString("en-US")}
        />
        <MetricCard
          label="Withdrawals pending"
          value={metrics.withdrawalsPending.toLocaleString("en-US")}
        />
        <MetricCard
          label="Revenue / profit"
          value="Not yet available"
          caption="Requires tracking liquidation value against quoted payout, not yet built"
        />
      </div>

      <CryptoBreakdownDropdown totals={metrics.cryptoWalletsBySymbol} />

      <NotificationsPanel notifications={metrics.notifications} />
    </div>
  );
}
