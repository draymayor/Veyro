import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

export type WalletTransactionType = 'credit' | 'debit';
export type AdminTransactionSource =
  | 'trade'
  | 'withdrawal'
  | 'manual_deposit'
  | 'crypto_deposit'
  | 'admin_adjustment';

export interface AdminTransactionListItem {
  id: string;
  created_at: string;
  user_id: string;
  user_display_name: string | null;
  user_email: string | null;
  ledger: 'fiat' | 'crypto';
  currency: string | null;
  crypto_symbol: string | null;
  type: WalletTransactionType;
  amount: number;
  balance_after: number;
  source: AdminTransactionSource;
  trade_id: string | null;
  trade_asset_type: string | null;
  trade_status: string | null;
  withdrawal_id: string | null;
  withdrawal_method: string | null;
  withdrawal_status: string | null;
  manual_deposit_reason: string | null;
}

interface ListFilters {
  userId?: string;
  type?: string;
  source?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
}

const VALID_TYPES: WalletTransactionType[] = ['credit', 'debit'];
const FIAT_SOURCES: AdminTransactionSource[] = [
  'trade',
  'withdrawal',
  'manual_deposit',
];
const CRYPTO_SOURCES: AdminTransactionSource[] = [
  'trade',
  'withdrawal',
  'crypto_deposit',
  'admin_adjustment',
];

const CREDIT_CRYPTO_TYPES = ['deposit', 'admin_credit'];
const DEBIT_CRYPTO_TYPES = [
  'sell_conversion_debit',
  'withdrawal',
  'admin_debit',
];

// All Transactions View (docs/admin-guide.md): the full platform ledger,
// merging every wallet_transactions row (fiat) and every
// crypto_wallet_transactions row (real held crypto, docs/database-schema.md)
// into one feed, joined to trades/withdrawals for context on what triggered
// each entry. Distinct from Trade Review and Payout Processing, which are
// action-oriented queues scoped to pending items - this is read-only
// oversight/lookup across everything, resolved or not.
@Injectable()
export class AdminTransactionsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async list(filters: ListFilters): Promise<AdminTransactionListItem[]> {
    const wantsFiat =
      !filters.source ||
      FIAT_SOURCES.includes(filters.source as AdminTransactionSource);
    const wantsCrypto =
      !filters.source ||
      CRYPTO_SOURCES.includes(filters.source as AdminTransactionSource);

    const [fiatRows, cryptoRows] = await Promise.all([
      wantsFiat ? this.listFiat(filters) : Promise.resolve([]),
      wantsCrypto ? this.listCrypto(filters) : Promise.resolve([]),
    ]);

    const merged = [...fiatRows, ...cryptoRows];
    merged.sort((a, b) => {
      const diff =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return filters.sort === 'asc' ? diff : -diff;
    });

    const userIds = merged.map((row) => row.user_id).filter(Boolean);
    const emailByUserId = await this.supabaseService.getUserEmailsByIds(
      Array.from(new Set(userIds)),
    );

    return merged.map((row) => ({
      ...row,
      user_email: emailByUserId.get(row.user_id) ?? null,
    }));
  }

  private async listFiat(
    filters: ListFilters,
  ): Promise<AdminTransactionListItem[]> {
    const client = this.supabaseService.getClient();

    // Filtering by user goes through wallet_id rather than a join-level
    // filter on the embedded wallets resource (PostgREST filters embedded
    // columns differently from top-level ones, and this keeps the query
    // shape identical to admin-users.service's wallet_ledger lookup). A
    // user with no wallets yet simply has no wallet_transactions rows,
    // returned as an empty list rather than an error.
    let walletIds: string[] | null = null;
    if (filters.userId) {
      const { data: wallets, error: walletError } = await client
        .from('wallets')
        .select('id')
        .eq('user_id', filters.userId);

      if (walletError) throw new Error(walletError.message);
      walletIds = (wallets ?? []).map((w) => w.id as string);
      if (walletIds.length === 0) return [];
    }

    // wallet_transactions has exactly one FK each into trades and
    // withdrawals (trade_id, withdrawal_id), unlike trades/withdrawals
    // themselves which each carry two FKs into users - so these embeds are
    // unambiguous to PostgREST without needing an explicit !fkey hint.
    let query = client
      .from('wallet_transactions')
      .select(
        'id, wallet_id, trade_id, withdrawal_id, type, amount, balance_after, created_at, ' +
          'wallets(user_id, currency, users(display_name)), ' +
          'trades(id, status, asset_type), ' +
          'withdrawals(id, status, method)',
      )
      .order('created_at', { ascending: filters.sort === 'asc' });

    if (walletIds) query = query.in('wallet_id', walletIds);

    if (
      filters.type &&
      VALID_TYPES.includes(filters.type as WalletTransactionType)
    ) {
      query = query.eq('type', filters.type);
    }

    if (
      filters.source &&
      FIAT_SOURCES.includes(filters.source as AdminTransactionSource)
    ) {
      if (filters.source === 'trade') {
        query = query.not('trade_id', 'is', null);
      } else if (filters.source === 'withdrawal') {
        query = query.not('withdrawal_id', 'is', null);
      } else {
        query = query.is('trade_id', null).is('withdrawal_id', null);
      }
    }

    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) {
      // dateTo arrives as a plain date (YYYY-MM-DD) from the filter's date
      // input, extended to the end of that day so the range is inclusive
      // of everything that happened on it, not just up to midnight.
      query = query.lte('created_at', `${filters.dateTo}T23:59:59.999Z`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    // Manual deposits (trade_id and withdrawal_id both null) carry their
    // reason in admin_actions, not on wallet_transactions itself - the same
    // place AdminDepositsService.execute logs it (target_id = the
    // wallet_transactions row it just created, action_type =
    // 'manual_deposit'). Batched once for the whole page rather than a
    // per-row query.
    const manualDepositIds = rows
      .filter((row) => !row.trade_id && !row.withdrawal_id)
      .map((row) => row.id as string);

    const reasonByTransactionId = new Map<string, string>();
    if (manualDepositIds.length > 0) {
      const { data: actions, error: actionsError } = await client
        .from('admin_actions')
        .select('target_id, notes')
        .eq('action_type', 'manual_deposit')
        .in('target_id', manualDepositIds);

      if (actionsError) throw new Error(actionsError.message);

      for (const action of actions ?? []) {
        if (action.notes) {
          reasonByTransactionId.set(
            action.target_id as string,
            action.notes as string,
          );
        }
      }
    }

    return rows.map((row) => {
      const wallet = row.wallets as {
        user_id: string;
        currency: string;
        users: { display_name: string | null } | null;
      } | null;
      const trade = row.trades as {
        id: string;
        status: string;
        asset_type: string;
      } | null;
      const withdrawal = row.withdrawals as {
        id: string;
        status: string;
        method: string;
      } | null;

      const source: AdminTransactionSource = trade
        ? 'trade'
        : withdrawal
          ? 'withdrawal'
          : 'manual_deposit';

      return {
        id: row.id as string,
        created_at: row.created_at as string,
        user_id: wallet?.user_id ?? '',
        user_display_name: wallet?.users?.display_name ?? null,
        user_email: null,
        ledger: 'fiat',
        currency: wallet?.currency ?? null,
        crypto_symbol: null,
        type: row.type as WalletTransactionType,
        amount: Number(row.amount),
        balance_after: Number(row.balance_after),
        source,
        trade_id: trade?.id ?? null,
        trade_asset_type: trade?.asset_type ?? null,
        trade_status: trade?.status ?? null,
        withdrawal_id: withdrawal?.id ?? null,
        withdrawal_method: withdrawal?.method ?? null,
        withdrawal_status: withdrawal?.status ?? null,
        manual_deposit_reason:
          reasonByTransactionId.get(row.id as string) ?? null,
      };
    });
  }

  private async listCrypto(
    filters: ListFilters,
  ): Promise<AdminTransactionListItem[]> {
    const client = this.supabaseService.getClient();

    // crypto_wallet_transactions carries user_id directly (unlike
    // wallet_transactions, which only reaches the user through wallet_id),
    // so filtering by user needs no lookup step here.
    let query = client
      .from('crypto_wallet_transactions')
      .select(
        'id, user_id, symbol, type, amount, balance_after, created_at, related_trade_id, related_withdrawal_id, ' +
          'users(display_name), ' +
          'trades(id, status, asset_type), ' +
          'withdrawals(id, status, method)',
      )
      .order('created_at', { ascending: filters.sort === 'asc' });

    if (filters.userId) query = query.eq('user_id', filters.userId);

    if (
      filters.type &&
      VALID_TYPES.includes(filters.type as WalletTransactionType)
    ) {
      query = query.in(
        'type',
        filters.type === 'credit' ? CREDIT_CRYPTO_TYPES : DEBIT_CRYPTO_TYPES,
      );
    }

    if (
      filters.source &&
      CRYPTO_SOURCES.includes(filters.source as AdminTransactionSource)
    ) {
      if (filters.source === 'trade') {
        query = query.not('related_trade_id', 'is', null);
      } else if (filters.source === 'withdrawal') {
        query = query.not('related_withdrawal_id', 'is', null);
      } else if (filters.source === 'crypto_deposit') {
        query = query.eq('type', 'deposit');
      } else {
        query = query.in('type', ['admin_credit', 'admin_debit']);
      }
    }

    if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
    if (filters.dateTo) {
      query = query.lte('created_at', `${filters.dateTo}T23:59:59.999Z`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as unknown as Record<string, unknown>[];

    return rows.map((row) => {
      const user = row.users as { display_name: string | null } | null;
      const trade = row.trades as {
        id: string;
        status: string;
        asset_type: string;
      } | null;
      const withdrawal = row.withdrawals as {
        id: string;
        status: string;
        method: string;
      } | null;

      const cryptoType = row.type as string;
      const source: AdminTransactionSource = trade
        ? 'trade'
        : withdrawal
          ? 'withdrawal'
          : cryptoType === 'deposit'
            ? 'crypto_deposit'
            : 'admin_adjustment';

      return {
        id: row.id as string,
        created_at: row.created_at as string,
        user_id: row.user_id as string,
        user_display_name: user?.display_name ?? null,
        user_email: null,
        ledger: 'crypto',
        currency: null,
        crypto_symbol: row.symbol as string,
        type: CREDIT_CRYPTO_TYPES.includes(cryptoType) ? 'credit' : 'debit',
        amount: Number(row.amount),
        balance_after: Number(row.balance_after),
        source,
        trade_id: trade?.id ?? null,
        trade_asset_type: trade?.asset_type ?? null,
        trade_status: trade?.status ?? null,
        withdrawal_id: withdrawal?.id ?? null,
        withdrawal_method: withdrawal?.method ?? null,
        withdrawal_status: withdrawal?.status ?? null,
        manual_deposit_reason: null,
      };
    });
  }
}
