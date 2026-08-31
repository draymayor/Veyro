import Link from "next/link";
import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
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
import type { AdminTradeListItem } from "@/lib/admin/trades/types";

function assetSummary(trade: AdminTradeListItem): string {
  if (trade.asset_type === "gift_card") {
    const brand = trade.gift_card_brand_name ?? "Gift card";
    const type = trade.card_type === "e-code" ? "E-Code" : "Physical";
    return `${brand} · ${trade.card_country ?? ""} · ${type}`.replace(
      / · $/,
      "",
    );
  }
  return `${trade.crypto_asset_symbol ?? "Crypto"} · ${trade.crypto_asset_network ?? ""}`.replace(
    / · $/,
    "",
  );
}

/**
 * One Trade Review queue row (docs/admin-guide.md). List-level fields
 * only, never card_code/card_pin (those are access-restricted to the
 * detail view, a separate route/request, so the list response never even
 * carries them, see AdminTradesService.list vs .detail on the API side).
 */
export function TradeRow({ trade }: { trade: AdminTradeListItem }) {
  const { label, tone } = tradeStatusInfo(trade.status as TradeStatus);

  return (
    <Link
      href={`/admin/trades/${trade.id}`}
      className="hover:bg-secondary/60 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors sm:gap-4 sm:px-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-ink truncate text-sm font-medium">
            {tradeUserLabel(trade.user_display_name, trade.user_id)}
          </span>
          {trade.fraud_flagged ? (
            <span
              title={trade.fraud_flag_reason ?? "Flagged for review"}
              className="bg-error/15 text-error flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
            >
              <ExclamationTriangleIcon className="size-3" aria-hidden="true" />
              Flagged
            </span>
          ) : null}
        </div>
        <p className="text-ink/50 truncate text-xs">{assetSummary(trade)}</p>
        <p className="text-ink/35 text-xs">
          {formatDateTime(trade.created_at)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-ink text-sm font-medium tabular-nums">
          {formatMoney(trade.quoted_payout, trade.currency)}
        </span>
        <StatusBadge label={label} tone={tone} />
      </div>
    </Link>
  );
}
