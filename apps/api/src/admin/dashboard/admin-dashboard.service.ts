import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CryptoPriceService } from '../../crypto-price/crypto-price.service';
import { FxRateService } from '../../fx/fx.service';
import { TATUM_WEBHOOK_SUBSCRIPTION_CAP } from '../../crypto-addresses/tatum.service';

export interface CurrencyTotal {
  currency: string;
  total: number;
}

export interface SymbolTotal {
  symbol: string;
  total: number;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  todaysTrades: number;
  pendingTrades: number;
  todaysVolumeByCurrency: CurrencyTotal[];
  walletLiabilitiesByCurrency: CurrencyTotal[];
  // Fiat wallet balances converted to USD (via FxRateService) plus crypto
  // wallet balances converted to USD (via CryptoPriceService's market
  // price) - a single blended figure, unlike walletLiabilitiesByCurrency
  // above which deliberately keeps currencies separate. This one exists
  // specifically to answer "what does Veyro owe, all in, as one number,"
  // which per-currency totals can't answer on their own. Best-effort: if
  // either price/FX source is down, the combined figure is omitted rather
  // than computed with stale/zero rates that would understate what's owed.
  walletLiabilitiesCombinedUsd: number | null;
  totalCryptoTrades: number;
  cryptoWalletsBySymbol: SymbolTotal[];
  withdrawalsPending: number;
  // Revenue/profit (spread between quoted payout and actual liquidation
  // value, per docs/admin-guide.md) isn't tracked anywhere yet, so this is
  // always false rather than a fabricated figure. Flip once that spread is
  // actually recorded somewhere (e.g. a liquidation_value column on trades).
  revenueAvailable: false;
  // Webhook-based deposit auto-crediting (docs/context.md's "hybrid
  // model"): the real, confirmed Tatum subscription cap is tiny (5 total,
  // platform-wide, shared across every chain - see
  // TATUM_WEBHOOK_SUBSCRIPTION_CAP) and will bind almost immediately, so
  // this is a real operational fact worth being visible on the
  // dashboard, not a hidden constant only discoverable by reading code.
  webhookCoverage: {
    slotsUsed: number;
    slotsTotal: number;
  };
  notifications: {
    pendingTrades: number;
    pendingWithdrawals: number;
    openSupportThreads: number;
    // A reorg reversed a webhook-credited deposit, but the user had
    // already spent/withdrawn the credited amount before it was caught -
    // deliberately never auto-resolved (no silent negative balance, no
    // automatic write-off), so this needs a human to actually look at it.
    orphanedReorgsNeedingReview: number;
  };
}

const PENDING_TRADE_STATUSES = [
  'under_review',
  'awaiting_deposit_confirmation',
];
const PENDING_WITHDRAWAL_STATUSES = ['requested', 'processing'];

function groupByCurrency(
  rows: { currency: string; amount: number }[],
): CurrencyTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.amount);
  }
  return Array.from(totals.entries()).map(([currency, total]) => ({
    currency,
    total,
  }));
}

// select symbol, sum(balance) from crypto_wallets group by symbol - done in
// JS rather than a Postgres RPC since every other grouped total on this
// dashboard (groupByCurrency above) already follows that same shape.
function groupBySymbol(
  rows: { symbol: string; balance: number }[],
): SymbolTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.symbol, (totals.get(row.symbol) ?? 0) + row.balance);
  }
  return Array.from(totals.entries())
    .map(([symbol, total]) => ({ symbol, total }))
    .sort((a, b) => b.total - a.total);
}

// Dashboard home (docs/admin-guide.md): every top-level metric is a real
// query against real data. No placeholders: a metric that genuinely can't
// be computed yet (revenue/profit) is flagged as unavailable rather than
// faked. Currency-grouped sums (volume, wallet liabilities) rather than one
// blended number, since wallets and trades hold different users' currencies
// (docs/context.md: currency is per-user, tied to country) and summing
// across currencies as one figure would misstate the total.
@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly cryptoPriceService: CryptoPriceService,
    private readonly fxRateService: FxRateService,
  ) {}

  async getMetrics(): Promise<AdminDashboardMetrics> {
    const client = this.supabaseService.getClient();
    const startOfTodayIso = new Date(
      new Date().setUTCHours(0, 0, 0, 0),
    ).toISOString();

    const [
      totalUsersRes,
      todaysTradesRes,
      pendingTradesRes,
      totalCryptoTradesRes,
      todaysVolumeRes,
      walletsRes,
      cryptoWalletsRes,
      withdrawalsPendingRes,
      openThreadsRes,
      unreadMessagesRes,
      webhookSlotsUsedRes,
      orphanedReorgsRes,
    ] = await Promise.all([
      client.from('users').select('id', { count: 'exact', head: true }),
      client
        .from('trades')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', startOfTodayIso),
      client
        .from('trades')
        .select('id', { count: 'exact', head: true })
        .in('status', PENDING_TRADE_STATUSES),
      client
        .from('trades')
        .select('id', { count: 'exact', head: true })
        .eq('asset_type', 'crypto'),
      client
        .from('trades')
        .select('quoted_payout, currency')
        .gte('created_at', startOfTodayIso),
      client.from('wallets').select('balance, currency'),
      client.from('crypto_wallets').select('symbol, balance'),
      client
        .from('withdrawals')
        .select('id', { count: 'exact', head: true })
        .in('status', PENDING_WITHDRAWAL_STATUSES),
      client.from('support_threads').select('user_id').eq('status', 'open'),
      client
        .from('support_messages')
        .select('user_id')
        .eq('sender', 'user')
        .is('read_at', null),
      // Not a count(*) head query: multiple rows (one per symbol) can
      // share the SAME address/subscription (an EVM address covering
      // ETH+USDT+USDC is 3 rows but 1 real Tatum slot) - counting rows
      // directly would overcount actual slots used, so this fetches the
      // addresses and dedupes in JS below, same "group in JS" pattern
      // groupByCurrency/groupBySymbol above already use on this
      // dashboard.
      client
        .from('user_crypto_addresses')
        .select('address')
        .not('tatum_subscription_id', 'is', null),
      client
        .from('crypto_deposit_events')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'orphaned_reorg_unrecoverable'),
    ]);

    for (const res of [
      totalUsersRes,
      todaysTradesRes,
      pendingTradesRes,
      totalCryptoTradesRes,
      todaysVolumeRes,
      walletsRes,
      cryptoWalletsRes,
      withdrawalsPendingRes,
      openThreadsRes,
      unreadMessagesRes,
      webhookSlotsUsedRes,
      orphanedReorgsRes,
    ]) {
      if (res.error) throw new Error(res.error.message);
    }

    const cryptoWalletsBySymbol = groupBySymbol(
      (cryptoWalletsRes.data ?? []).map((row) => ({
        symbol: row.symbol as string,
        balance: Number(row.balance),
      })),
    );

    const walletLiabilitiesCombinedUsd = await this.combinedLiabilitiesUsd(
      (walletsRes.data ?? []).map((row) => ({
        currency: row.currency as string,
        amount: Number(row.balance),
      })),
      cryptoWalletsBySymbol,
    );

    const openThreadUserIds = new Set(
      (openThreadsRes.data ?? []).map((row) => row.user_id as string),
    );
    const unreadUserIds = new Set(
      (unreadMessagesRes.data ?? []).map((row) => row.user_id as string),
    );
    let openSupportThreads = 0;
    for (const userId of unreadUserIds) {
      if (openThreadUserIds.has(userId)) openSupportThreads += 1;
    }

    const pendingTrades = pendingTradesRes.count ?? 0;
    const withdrawalsPending = withdrawalsPendingRes.count ?? 0;
    const webhookSlotsUsed = new Set(
      (webhookSlotsUsedRes.data ?? []).map((row) => row.address as string),
    ).size;
    const orphanedReorgsNeedingReview = orphanedReorgsRes.count ?? 0;

    return {
      totalUsers: totalUsersRes.count ?? 0,
      todaysTrades: todaysTradesRes.count ?? 0,
      pendingTrades,
      todaysVolumeByCurrency: groupByCurrency(
        (todaysVolumeRes.data ?? []).map((row) => ({
          currency: row.currency as string,
          amount: Number(row.quoted_payout),
        })),
      ),
      walletLiabilitiesByCurrency: groupByCurrency(
        (walletsRes.data ?? []).map((row) => ({
          currency: row.currency as string,
          amount: Number(row.balance),
        })),
      ),
      walletLiabilitiesCombinedUsd,
      totalCryptoTrades: totalCryptoTradesRes.count ?? 0,
      cryptoWalletsBySymbol,
      withdrawalsPending,
      revenueAvailable: false,
      webhookCoverage: {
        slotsUsed: webhookSlotsUsed,
        slotsTotal: TATUM_WEBHOOK_SUBSCRIPTION_CAP,
      },
      notifications: {
        pendingTrades,
        pendingWithdrawals: withdrawalsPending,
        openSupportThreads,
        orphanedReorgsNeedingReview,
      },
    };
  }

  // Fiat wallet balances converted to USD via FxRateService, plus crypto
  // wallet balances converted to USD via CryptoPriceService's market price -
  // see walletLiabilitiesCombinedUsd's doc comment on the interface for why
  // this exists alongside the per-currency breakdown. Returns null (never a
  // partial/understated number) if either price source is unavailable, so
  // the dashboard shows "unavailable" rather than a silently wrong total.
  private async combinedLiabilitiesUsd(
    fiatByCurrency: { currency: string; amount: number }[],
    cryptoBySymbol: SymbolTotal[],
  ): Promise<number | null> {
    try {
      // Per-currency getRate(), not the bulk getUsdRates() map directly:
      // the bulk primary-provider response can omit a currency entirely on
      // its free tier (confirmed live for NGN) while still returning success
      // for the others, and only getRate() knows to fall back to
      // CurrencyFreaks for a currency missing from the primary response (see
      // its own doc comment). Indexing the bulk map directly, as an earlier
      // version of this method did, silently produced `undefined` for NGN
      // and NaN'd the whole total - caught by actually running this against
      // live rates, not by inspection.
      const [fxRateEntries, cryptoRates] = await Promise.all([
        Promise.all(
          fiatByCurrency.map(
            async ({ currency }) =>
              [currency, await this.fxRateService.getRate(currency)] as const,
          ),
        ),
        this.cryptoPriceService.getRates(),
      ]);
      const fxRates = Object.fromEntries(fxRateEntries);

      let totalUsd = 0;

      for (const { currency, amount } of fiatByCurrency) {
        const rate = fxRates[currency];
        if (rate === undefined) {
          throw new Error(`No FX rate available for currency "${currency}"`);
        }
        totalUsd += amount / rate;
      }

      for (const { symbol, total } of cryptoBySymbol) {
        const priceUsd = cryptoRates[symbol]?.priceUsd;
        if (priceUsd === undefined) {
          throw new Error(
            `No USD price available for crypto symbol "${symbol}"`,
          );
        }
        totalUsd += total * priceUsd;
      }

      return totalUsd;
    } catch {
      // Best-effort: FX/price providers can be temporarily down (both
      // already have their own fallback/cache logic - see FxRateService,
      // CryptoPriceService). If a rate is still missing after that, this
      // combined figure is not computable right now - omit it rather than
      // publish a total missing an unknown chunk of what's actually owed.
      return null;
    }
  }
}
