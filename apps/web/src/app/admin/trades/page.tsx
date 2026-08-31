import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminTradeListItem } from "@/lib/admin/trades/types";
import { TradeFilters } from "@/components/admin/trades/trade-filters";
import { TradeRow } from "@/components/admin/trades/trade-row";

interface PageProps {
  searchParams: Promise<{ status?: string; assetType?: string }>;
}

// Trade Review queue (docs/admin-guide.md): one queue, filterable by asset
// type and status, backed by real GET /admin/trades queries. List rows
// only carry summary fields, card_code/card_pin never leave the detail
// endpoint (see admin-trades.service.ts's list vs detail selects), so
// there's nothing access-restricted to accidentally leak here.
export default async function AdminTradesPage({ searchParams }: PageProps) {
  const { status, assetType } = await searchParams;

  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (assetType) query.set("assetType", assetType);
  const queryString = query.toString();

  const trades = await adminFetch<AdminTradeListItem[]>(
    `/admin/trades${queryString ? `?${queryString}` : ""}`,
  );

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-ink text-lg font-semibold sm:text-xl">
          Trade Review
        </h1>
        <TradeFilters />
      </div>

      {trades === null ? (
        <p className="text-ink/60 text-sm">
          Couldn&apos;t load trades. Try refreshing the page.
        </p>
      ) : trades.length === 0 ? (
        <p className="border-border text-ink/50 rounded-2xl border border-dashed px-4 py-10 text-center text-sm">
          No trades match these filters.
        </p>
      ) : (
        <div className="flex flex-col">
          {trades.map((trade) => (
            <TradeRow key={trade.id} trade={trade} />
          ))}
        </div>
      )}
    </div>
  );
}
