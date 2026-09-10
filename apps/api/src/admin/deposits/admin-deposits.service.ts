import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { WalletService } from '../../wallet/wallet.service';
import { CryptoWalletService } from '../../crypto-wallet/crypto-wallet.service';
import { NotificationsService } from '../../notifications/notifications.service';

export type ManualDepositType = 'fiat' | 'crypto';

export interface ManualDepositQuote {
  userId: string;
  displayName: string | null;
  email: string | null;
  depositType: ManualDepositType;
  /** Fiat deposits only - the wallet currency being credited. */
  walletCurrency: string | null;
  /** Crypto deposits only - the symbol being credited. */
  symbol: string | null;
  creditAmount: number;
  sourceLabel: string;
}

export interface ManualDepositResult extends ManualDepositQuote {
  ledgerEntryId: string;
  newBalance: number;
}

export interface ManualDepositHistoryItem {
  actionId: string;
  createdAt: string;
  depositType: ManualDepositType;
  adminId: string;
  adminDisplayName: string | null;
  userId: string | null;
  userDisplayName: string | null;
  amount: number | null;
  walletCurrency: string | null;
  symbol: string | null;
  reason: string | null;
}

interface ManualDepositInput {
  userId: string;
  depositType: ManualDepositType;
  amount: number;
  symbol?: string;
  network?: string;
}

// Manual Deposit (docs/admin-guide.md): admin credits fiat or crypto
// directly to a user's account for something automated detection missed.
// The two deposit types are genuinely separate models now
// (docs/product-rules.md rules 6a/16, database-schema.md's crypto_wallets):
// a fiat deposit credits the fiat `wallets` balance directly, exactly as
// before. A crypto deposit is this feature's admin-manual-check half of
// the hybrid deposit-confirmation model (the other half being a webhook,
// not yet built) - it credits the user's REAL held crypto_wallets balance
// for that symbol, at face value (no price conversion, no fiat wallet
// touched at all), the same way a webhook-detected deposit would. The
// quote step never trusts a client-supplied credit amount: quote() and
// execute() both recompute it from the raw inputs every time.
@Injectable()
export class AdminDepositsService {
  private readonly logger = new Logger(AdminDepositsService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly walletService: WalletService,
    private readonly cryptoWalletService: CryptoWalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async quote(input: ManualDepositInput): Promise<ManualDepositQuote> {
    const client = this.supabaseService.getClient();

    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Enter a valid amount.');
    }

    const { data: user } = await client
      .from('users')
      .select('id, display_name, currency')
      .eq('id', input.userId)
      .maybeSingle();

    if (!user) throw new NotFoundException('User not found.');

    const emailByUserId = await this.supabaseService.getUserEmailsByIds([
      user.id as string,
    ]);

    if (input.depositType === 'fiat') {
      if (!user.currency) {
        throw new BadRequestException(
          'This user has no wallet currency set yet.',
        );
      }
      const walletCurrency = user.currency as string;
      return {
        userId: user.id as string,
        displayName: user.display_name as string | null,
        email: emailByUserId.get(user.id as string) ?? null,
        depositType: 'fiat',
        walletCurrency,
        symbol: null,
        creditAmount: amount,
        sourceLabel: this.formatMoney(amount, walletCurrency),
      };
    }

    if (input.depositType === 'crypto') {
      const symbol = input.symbol?.trim().toUpperCase();
      const network = input.network?.trim();
      if (!symbol || !network) {
        throw new BadRequestException('Select an asset and network.');
      }

      const { data: asset } = await client
        .from('crypto_assets')
        .select('id')
        .eq('symbol', symbol)
        .eq('network', network)
        .maybeSingle();

      if (!asset) {
        throw new BadRequestException('That asset/network is not supported.');
      }

      return {
        userId: user.id as string,
        displayName: user.display_name as string | null,
        email: emailByUserId.get(user.id as string) ?? null,
        depositType: 'crypto',
        walletCurrency: null,
        symbol,
        creditAmount: amount,
        sourceLabel: `${amount} ${symbol}`,
      };
    }

    throw new BadRequestException('Invalid deposit type.');
  }

  async execute(
    adminId: string,
    input: ManualDepositInput,
    reason: string,
  ): Promise<ManualDepositResult> {
    const trimmedReason = reason?.trim();
    if (!trimmedReason) {
      throw new BadRequestException(
        'A reason is required for a manual deposit.',
      );
    }

    // Recomputed from the raw inputs, never the amount a client might send
    // back from a prior preview call, prices can move (fiat) or the input
    // itself is untrustworthy (crypto) between the two requests, and this
    // is a real financial credit either way.
    const quote = await this.quote(input);

    const client = this.supabaseService.getClient();

    const { ledgerEntryId, newBalance } =
      quote.depositType === 'fiat'
        ? await this.executeFiat(client, quote)
        : await this.executeCrypto(client, quote);

    // target_id points at the ledger row this action created, the most
    // specific record of exactly what was credited, notes carries the
    // required reason for the audit trail. The credit above already
    // happened and both ledgers are append-only, so there is nothing to
    // roll back if this insert fails, only log it loudly rather than
    // throwing and making the admin think the credit itself failed, which
    // would risk a duplicate submission.
    const { error: logError } = await client.from('admin_actions').insert({
      admin_id: adminId,
      action_type:
        quote.depositType === 'fiat'
          ? 'manual_deposit'
          : 'manual_crypto_deposit',
      target_id: ledgerEntryId,
      notes: trimmedReason,
    });

    if (logError) {
      this.logger.error(
        `Manual ${quote.depositType} deposit succeeded (ledger entry ${ledgerEntryId}) but admin_actions logging failed: ${logError.message}`,
      );
    }

    if (quote.email) {
      try {
        if (quote.depositType === 'fiat') {
          await this.notificationsService.sendWalletCreditedEmail({
            email: quote.email,
            name: quote.displayName ?? 'there',
            amount: this.formatMoney(quote.creditAmount, quote.walletCurrency!),
            balance: this.formatMoney(newBalance, quote.walletCurrency!),
          });
        } else {
          await this.notificationsService.sendCryptoDepositCreditedEmail({
            email: quote.email,
            name: quote.displayName ?? 'there',
            amount: `${quote.creditAmount} ${quote.symbol}`,
            balance: `${newBalance} ${quote.symbol}`,
          });
        }
      } catch {
        // Already logged by NotificationsService.send().
      }
    }

    return {
      ...quote,
      ledgerEntryId,
      newBalance,
    };
  }

  // Manual Deposit history: every credit this feature has ever made is
  // already logged to admin_actions (execute() above), so this reads that
  // log rather than a new table. admin_actions.target_id is polymorphic
  // (it points at whichever ledger table action_type implies), so it can't
  // be embedded via a normal PostgREST relationship - the ledger rows are
  // fetched in two batched follow-up queries (one per deposit type) and
  // joined back onto the action rows in memory instead.
  async history(): Promise<ManualDepositHistoryItem[]> {
    const client = this.supabaseService.getClient();

    const { data: actions, error } = await client
      .from('admin_actions')
      .select('id, admin_id, action_type, target_id, notes, created_at')
      .in('action_type', ['manual_deposit', 'manual_crypto_deposit'])
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);
    if (!actions || actions.length === 0) return [];

    const fiatIds = actions
      .filter((a) => a.action_type === 'manual_deposit')
      .map((a) => a.target_id as string);
    const cryptoIds = actions
      .filter((a) => a.action_type === 'manual_crypto_deposit')
      .map((a) => a.target_id as string);
    const adminIds = [...new Set(actions.map((a) => a.admin_id as string))];

    const [fiatResult, cryptoResult, adminResult] = await Promise.all([
      fiatIds.length
        ? client
            .from('wallet_transactions')
            .select(
              'id, amount, wallets(user_id, currency, users(display_name))',
            )
            .in('id', fiatIds)
        : Promise.resolve({ data: [], error: null }),
      cryptoIds.length
        ? client
            .from('crypto_wallet_transactions')
            .select('id, amount, symbol, user_id, users(display_name)')
            .in('id', cryptoIds)
        : Promise.resolve({ data: [], error: null }),
      adminIds.length
        ? client.from('users').select('id, display_name').in('id', adminIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (fiatResult.error) throw new Error(fiatResult.error.message);
    if (cryptoResult.error) throw new Error(cryptoResult.error.message);
    if (adminResult.error) throw new Error(adminResult.error.message);

    interface FiatLedgerRow {
      id: string;
      amount: number;
      wallets: {
        user_id: string;
        currency: string;
        users: { display_name: string | null } | null;
      } | null;
    }
    interface CryptoLedgerRow {
      id: string;
      amount: number;
      symbol: string;
      user_id: string;
      users: { display_name: string | null } | null;
    }

    const fiatMap = new Map(
      ((fiatResult.data ?? []) as unknown as FiatLedgerRow[]).map((row) => [
        row.id,
        row,
      ]),
    );
    const cryptoMap = new Map(
      ((cryptoResult.data ?? []) as unknown as CryptoLedgerRow[]).map((row) => [
        row.id,
        row,
      ]),
    );
    const adminNameMap = new Map(
      (
        (adminResult.data ?? []) as {
          id: string;
          display_name: string | null;
        }[]
      ).map((row) => [row.id, row.display_name]),
    );

    return actions.map((action) => {
      const depositType: ManualDepositType =
        action.action_type === 'manual_deposit' ? 'fiat' : 'crypto';
      const ledger =
        depositType === 'fiat'
          ? fiatMap.get(action.target_id as string)
          : cryptoMap.get(action.target_id as string);

      const fiatLedger =
        depositType === 'fiat'
          ? (ledger as FiatLedgerRow | undefined)
          : undefined;
      const cryptoLedger =
        depositType === 'crypto'
          ? (ledger as CryptoLedgerRow | undefined)
          : undefined;

      return {
        actionId: action.id as string,
        createdAt: action.created_at as string,
        depositType,
        adminId: action.admin_id as string,
        adminDisplayName: adminNameMap.get(action.admin_id as string) ?? null,
        userId: fiatLedger?.wallets?.user_id ?? cryptoLedger?.user_id ?? null,
        userDisplayName:
          fiatLedger?.wallets?.users?.display_name ??
          cryptoLedger?.users?.display_name ??
          null,
        amount: fiatLedger?.amount ?? cryptoLedger?.amount ?? null,
        walletCurrency: fiatLedger?.wallets?.currency ?? null,
        symbol: cryptoLedger?.symbol ?? null,
        reason: action.notes as string | null,
      };
    });
  }

  private async executeFiat(
    client: ReturnType<SupabaseService['getClient']>,
    quote: ManualDepositQuote,
  ): Promise<{ ledgerEntryId: string; newBalance: number }> {
    const credit = await this.walletService.creditStandaloneWallet(
      client,
      quote.userId,
      quote.walletCurrency!,
      quote.creditAmount,
    );
    return {
      ledgerEntryId: credit.walletTransactionId,
      newBalance: credit.balanceAfter,
    };
  }

  private async executeCrypto(
    client: ReturnType<SupabaseService['getClient']>,
    quote: ManualDepositQuote,
  ): Promise<{ ledgerEntryId: string; newBalance: number }> {
    const credit = await this.cryptoWalletService.creditWallet(
      client,
      quote.userId,
      quote.symbol!,
      quote.creditAmount,
      'admin_credit',
    );
    return {
      ledgerEntryId: credit.cryptoWalletTransactionId,
      newBalance: credit.balanceAfter,
    };
  }

  private formatMoney(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString('en-US')}`;
    }
  }
}
