import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export interface CurrencyTotal {
  currency: string;
  total: number;
}

export interface AdminDashboardMetrics {
  totalUsers: number;
  todaysTrades: number;
  pendingTrades: number;
  todaysVolumeByCurrency: CurrencyTotal[];
  walletLiabilitiesByCurrency: CurrencyTotal[];
  withdrawalsPending: number;
  // Revenue/profit (spread between quoted payout and actual liquidation
  // value, per docs/admin-guide.md) isn't tracked anywhere yet, so this is
  // always false rather than a fabricated figure. Flip once that spread is
  // actually recorded somewhere (e.g. a liquidation_value column on trades).
  revenueAvailable: false;
  notifications: {
    pendingTrades: number;
    pendingWithdrawals: number;
    openSupportThreads: number;
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

// Dashboard home (docs/admin-guide.md): every top-level metric is a real
// query against real data. No placeholders: a metric that genuinely can't
// be computed yet (revenue/profit) is flagged as unavailable rather than
// faked. Currency-grouped sums (volume, wallet liabilities) rather than one
// blended number, since wallets and trades hold different users' currencies
// (docs/context.md: currency is per-user, tied to country) and summing
// across currencies as one figure would misstate the total.
@Injectable()
export class AdminDashboardService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getMetrics(): Promise<AdminDashboardMetrics> {
    const client = this.supabaseService.getClient();
    const startOfTodayIso = new Date(
      new Date().setUTCHours(0, 0, 0, 0),
    ).toISOString();

    const [
      totalUsersRes,
      todaysTradesRes,
      pendingTradesRes,
      todaysVolumeRes,
      walletsRes,
      withdrawalsPendingRes,
      openThreadsRes,
      unreadMessagesRes,
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
        .select('quoted_payout, currency')
        .gte('created_at', startOfTodayIso),
      client.from('wallets').select('balance, currency'),
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
    ]);

    for (const res of [
      totalUsersRes,
      todaysTradesRes,
      pendingTradesRes,
      todaysVolumeRes,
      walletsRes,
      withdrawalsPendingRes,
      openThreadsRes,
      unreadMessagesRes,
    ]) {
      if (res.error) throw new Error(res.error.message);
    }

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
      withdrawalsPending,
      revenueAvailable: false,
      notifications: {
        pendingTrades,
        pendingWithdrawals: withdrawalsPending,
        openSupportThreads,
      },
    };
  }
}
