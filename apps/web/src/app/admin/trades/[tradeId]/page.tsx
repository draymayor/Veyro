import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminTradeDetail } from "@/lib/admin/trades/types";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  tradeStatusInfo,
  type TradeStatus,
} from "@/lib/dashboard/trade-status";
import {
  tradeUserLabel,
  formatMoney,
  formatDateTime,
} from "@/lib/admin/trades/display";
import { TradeActions } from "@/components/admin/trades/trade-actions";

interface PageProps {
  params: Promise<{ tradeId: string }>;
}

// Trade Review detail view (docs/admin-guide.md): card_code/card_pin only
// ever reach the browser through this route's response, never the list
// (see AdminTradesService.detail on the API side). A crypto trade here is
// always TradesService.sellCrypto's instant conversion (docs/product-rules.md
// rule 6a, REVISED AGAIN) - it lands directly in 'paid', there's nothing
// left to confirm or approve, unlike a gift card trade. Deposit
// confirmation itself now happens separately, against the user's real
// crypto_wallets balance (the admin Manual Deposit feature's crypto path,
// or a future webhook), not through this trades-based review queue at all.
export default async function AdminTradeDetailPage({ params }: PageProps) {
  const { tradeId } = await params;
  const trade = await adminFetch<AdminTradeDetail>(`/admin/trades/${tradeId}`);

  if (!trade) notFound();

  const { label, tone } = tradeStatusInfo(trade.status as TradeStatus);
  const isGiftCard = trade.asset_type === "gift_card";

  return (
    <div className="mx-auto flex max-w-2xl min-w-0 flex-col gap-5">
      <Link
        href="/admin/trades"
        className="text-ink/60 hover:text-ink flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
        Trade Review
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          {isGiftCard ? "Gift Card Trade" : "Crypto Trade"}
        </h1>
        <StatusBadge label={label} tone={tone} />
      </div>

      {trade.fraud_flagged ? (
        <div className="bg-error/10 border-error/20 flex items-start gap-3 rounded-2xl border p-4">
          <ExclamationTriangleIcon
            className="text-error mt-0.5 size-5 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-error text-sm font-semibold">
              Flagged for fraud review
            </p>
            <p className="text-error/80 mt-1 text-sm">
              {trade.fraud_flag_reason}
            </p>
            {trade.fraud_flag_ref_trade_id ? (
              <Link
                href={`/admin/trades/${trade.fraud_flag_ref_trade_id}`}
                className="text-error mt-1 inline-block text-sm underline underline-offset-2"
              >
                View matching trade
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {trade.status === "rejected" && trade.rejection_reason ? (
        <div className="bg-secondary rounded-2xl p-4">
          <p className="text-ink/60 text-xs font-medium">Rejection reason</p>
          <p className="text-ink mt-1 text-sm">{trade.rejection_reason}</p>
        </div>
      ) : null}

      <Section title="User">
        <Row
          label="Name"
          value={tradeUserLabel(trade.user_display_name, trade.user_id)}
        />
        {trade.user_email ? (
          <Row label="Email" value={trade.user_email} />
        ) : null}
        <Row label="Submitted" value={formatDateTime(trade.created_at)} />
      </Section>

      {isGiftCard ? (
        <Section title="Gift Card">
          <Row label="Brand" value={trade.gift_card_brand_name ?? "-"} />
          <Row label="Country" value={trade.card_country ?? "-"} />
          <Row
            label="Type"
            value={trade.card_type === "e-code" ? "E-Code" : "Physical"}
          />
          <Row
            label="Value"
            value={formatMoney(trade.asset_amount, trade.currency)}
          />
        </Section>
      ) : (
        <Section title="Crypto">
          <Row label="Asset" value={trade.crypto_asset_symbol ?? "-"} />
          <Row label="Network" value={trade.crypto_asset_network ?? "-"} />
          <Row label="Amount" value={String(trade.asset_amount)} />
        </Section>
      )}

      <Section title="Rate & Payout">
        <Row label="Locked rate" value={String(trade.rate_value)} />
        <Row
          label="Payout"
          value={formatMoney(trade.quoted_payout, trade.currency)}
        />
      </Section>

      {isGiftCard ? (
        <Section title="Submitted Code">
          {trade.card_code ? (
            <div className="bg-secondary flex flex-col gap-1 rounded-xl px-3 py-2.5">
              <span className="text-ink/50 text-[11px] font-medium">
                Code (access-restricted)
              </span>
              <span className="text-ink font-mono text-sm break-all">
                {trade.card_code}
              </span>
            </div>
          ) : null}
          {trade.card_pin ? (
            <div className="bg-secondary mt-2 flex flex-col gap-1 rounded-xl px-3 py-2.5">
              <span className="text-ink/50 text-[11px] font-medium">
                PIN (access-restricted)
              </span>
              <span className="text-ink font-mono text-sm break-all">
                {trade.card_pin}
              </span>
            </div>
          ) : null}
          {!trade.card_code && !trade.card_pin ? (
            <p className="text-ink/50 text-sm">
              No code submitted, expecting uploaded images.
            </p>
          ) : null}
        </Section>
      ) : (
        <Section title="Sell Conversion">
          <p className="text-ink/60 text-sm leading-relaxed">
            An instant conversion of an already-held crypto balance - no
            approval step, nothing pending. The crypto side (crypto_wallets) was
            debited and the fiat wallet credited in the same action.
          </p>
        </Section>
      )}

      {isGiftCard && trade.files.length > 0 ? (
        <Section title="Uploaded Files">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {trade.files.map((file) =>
              file.signedUrl ? (
                <a
                  key={file.id}
                  href={file.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="border-border block overflow-hidden rounded-xl border"
                >
                  <Image
                    src={file.signedUrl}
                    alt={
                      file.file_type === "receipt" ? "Receipt" : "Card image"
                    }
                    width={200}
                    height={200}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                  <span className="text-ink/50 block px-2 py-1 text-[11px]">
                    {file.file_type === "receipt" ? "Receipt" : "Card image"}
                  </span>
                </a>
              ) : null,
            )}
          </div>
        </Section>
      ) : null}

      <TradeActions tradeId={trade.id} status={trade.status} />
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
