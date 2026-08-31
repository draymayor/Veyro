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
