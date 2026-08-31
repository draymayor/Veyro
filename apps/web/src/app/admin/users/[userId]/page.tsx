import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminUserDetail } from "@/lib/admin/users/types";
import {
  userLabel,
  formatMoney,
  formatDateTime,
} from "@/lib/admin/users/display";
import { AccountStatusSelect } from "@/components/admin/users/account-status-select";
import { SuspendWithdrawalsButton } from "@/components/admin/users/suspend-withdrawals-button";
import { SecurityResetActions } from "@/components/admin/users/security-reset-actions";

interface PageProps {
  params: Promise<{ userId: string }>;
}

const KYC_LABELS: Record<string, string> = {
  not_started: "Not started",
  manual_reviewed: "Manually reviewed",
};

// User Management detail (docs/admin-guide.md): full transaction history
// (trades, withdrawals, wallet ledger), who referred them, total trading
// volume, editable account status, the shared withdrawal-suspension
// toggle, KYC status (view-only, manual judgment call for V1), and the
// sensitive TOTP/withdrawal-PIN reset actions.
export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const user = await adminFetch<AdminUserDetail>(`/admin/users/${userId}`);

  if (!user) notFound();

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-5">
      <Link
        href="/admin/users"
        className="text-ink/60 hover:text-ink flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        User Management
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
            {userLabel(user.display_name, user.id)}
          </h1>
          <p className="text-ink/50 text-sm">
            {user.email ?? "No email on file"}
          </p>
          <p className="text-ink/40 text-xs">
            Joined {formatDateTime(user.created_at)}
          </p>
        </div>
        <AccountStatusSelect userId={user.id} status={user.account_status} />
      </div>

      <SuspendWithdrawalsButton
        userId={user.id}
        suspended={user.withdrawals_suspended}
      />

      <Section title="Profile">
        <Row label="Country" value={user.country ?? "-"} />
        <Row label="Currency" value={user.currency ?? "-"} />
        <Row
          label="KYC status"
          value={KYC_LABELS[user.kyc_status] ?? user.kyc_status}
        />
        <Row label="Referral code" value={user.referral_code ?? "-"} />
        <Row
          label="Referred by"
          value={
            user.referrer
              ? `${userLabel(user.referrer.display_name, user.referrer.id)} (${user.referrer.email ?? "no email"})`
              : "No referrer"
          }
        />
        <Row
          label="Total trading volume"
          value={formatMoney(user.total_trading_volume, user.currency)}
        />
      </Section>

      <Section title="Trade History">
        {user.trades.length === 0 ? (
          <p className="text-ink/50 text-sm">No trades yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {user.trades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-ink/70 min-w-0 truncate text-xs">
                  {trade.asset_type === "gift_card"
                    ? (trade.gift_card_brand_name ?? "Gift card")
                    : `${trade.crypto_asset_symbol ?? "Crypto"} · ${trade.crypto_asset_network ?? ""}`}
                  {" · "}
                  {trade.status}
                  {" · "}
                  {formatDateTime(trade.created_at)}
                </span>
                <span className="text-ink shrink-0 text-xs font-medium tabular-nums">
                  {formatMoney(trade.quoted_payout, trade.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Withdrawal History">
        {user.withdrawals.length === 0 ? (
          <p className="text-ink/50 text-sm">No withdrawals yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {user.withdrawals.map((withdrawal) => (
              <div
                key={withdrawal.id}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-ink/70 min-w-0 truncate text-xs">
                  {withdrawal.method} · {withdrawal.status} ·{" "}
                  {formatDateTime(withdrawal.created_at)}
                  {withdrawal.transaction_reference
                    ? ` · ${withdrawal.transaction_reference}`
                    : ""}
                </span>
                <span className="text-ink shrink-0 text-xs font-medium tabular-nums">
                  {formatMoney(withdrawal.amount, user.currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Wallet Ledger">
        {user.wallet_ledger.length === 0 ? (
          <p className="text-ink/50 text-sm">No wallet activity yet.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {user.wallet_ledger.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-ink/70 min-w-0 truncate text-xs">
                  {entry.type} · {formatDateTime(entry.created_at)}
                </span>
                <span className="text-ink shrink-0 text-xs font-medium tabular-nums">
                  {entry.type === "debit" ? "-" : "+"}
                  {formatMoney(entry.amount, entry.wallet_currency)}
                  {" -> "}
                  {formatMoney(entry.balance_after, entry.wallet_currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Security Override">
        <p className="text-ink/60 mb-3 text-sm leading-relaxed">
          For a user fully locked out of both their authenticator app and their
          backup codes, or whose withdrawal PIN is locked with the email-reset
          path also failing them.
        </p>
        <SecurityResetActions userId={user.id} />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border-border rounded-2xl border p-4 sm:p-5">
      <h2 className="text-ink/60 mb-2 text-xs font-semibold tracking-wide uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-ink/50 text-sm">{label}</span>
      <span className="text-ink text-right text-sm font-medium break-all">
        {value}
      </span>
    </div>
  );
}
