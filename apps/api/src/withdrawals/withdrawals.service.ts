import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { CryptoWalletService } from '../crypto-wallet/crypto-wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

export type WithdrawalMethod = 'bank_transfer' | 'paypal' | 'crypto';

interface CreateWithdrawalInput {
  amount: number;
  method: WithdrawalMethod;
  bankAccountId?: string;
  paypalEmail?: string;
  cryptoSymbol?: string;
  cryptoNetwork?: string;
  cryptoPayoutAddress?: string;
}

export interface WithdrawalRow {
  id: string;
  amount: number;
  method: WithdrawalMethod;
  status: string;
  created_at: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// platform_settings key (docs/database-schema.md, product-rules.md rule
// 18b): default 'false' means crypto withdrawals skip the requested-first
// approval queue entirely, see statusForMethod below.
const CRYPTO_APPROVAL_SETTING_KEY = 'crypto_withdrawal_requires_approval';

// Method-specific payout details, per docs/database-schema.md's withdrawals
// table (docs/product-rules.md rule 18). No gateway integration in V1: this
// just records the request for manual admin processing.
@Injectable()
export class WithdrawalsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly walletService: WalletService,
    private readonly cryptoWalletService: CryptoWalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    user: User,
    input: CreateWithdrawalInput,
  ): Promise<WithdrawalRow> {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Enter a valid withdrawal amount.');
    }

    const client = this.supabaseService.getClient();

    // Product-rules.md rule 18c: a narrower restriction than account_status,
    // checked here at submission time so a suspended user's normal use of
    // the rest of the app (selling, browsing) is never affected.
    const { data: userRow } = await client
      .from('users')
      .select('withdrawals_suspended, currency')
      .eq('id', user.id)
      .maybeSingle();

    if (userRow?.withdrawals_suspended) {
      throw new BadRequestException(
        'Withdrawals are currently suspended on your account. Contact support for help.',
      );
    }

    const currency = userRow?.currency as string | undefined;

    const row: Record<string, unknown> = {
      user_id: user.id,
      amount,
      method: input.method,
      status: await this.statusForMethod(client, input.method),
    };

    // Crypto withdrawals debit the real held crypto_wallets balance for the
    // requested symbol (docs/product-rules.md rules 6a/16) - a completely
    // separate ledger from the fiat wallet, never touched by this method.
    // Bank/PayPal withdrawals still debit the fiat wallet as before.
    let cryptoSymbol: string | undefined;

    if (input.method === 'bank_transfer' || input.method === 'paypal') {
      if (!currency) {
        throw new BadRequestException(
          'Your account has no wallet currency set yet.',
        );
      }

      // Early, friendly balance check before a withdrawals row even
      // exists. WalletService.debitStandaloneWallet re-checks this
      // authoritatively once the withdrawal is created (see below),
      // guarding against a race between this read and the debit (e.g. two
      // withdrawal requests submitted back to back).
      const { data: wallet } = await client
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .eq('currency', currency)
        .maybeSingle();

      if (Number(wallet?.balance ?? 0) < amount) {
        throw new BadRequestException(
          'Insufficient wallet balance for this withdrawal.',
        );
      }

      if (input.method === 'bank_transfer') {
        if (!input.bankAccountId) {
          throw new BadRequestException(
            'Select a bank account to withdraw to.',
          );
        }

        const { data: account, error } = await client
          .from('user_bank_accounts')
          .select('country, bank_details')
          .eq('id', input.bankAccountId)
          .eq('user_id', user.id)
          .maybeSingle<{
            country: string;
            bank_details: Record<string, unknown>;
          }>();

        if (error || !account) {
          throw new BadRequestException(
            'That bank account could not be found.',
          );
        }

        row.bank_details = {
          country: account.country,
          ...account.bank_details,
        };
      } else {
        const email = input.paypalEmail?.trim();
        if (!email || !EMAIL_PATTERN.test(email)) {
          throw new BadRequestException('Enter a valid PayPal email address.');
        }
        row.paypal_email = email;
      }
    } else if (input.method === 'crypto') {
      const symbol = input.cryptoSymbol?.trim().toUpperCase();
      const network = input.cryptoNetwork?.trim();
      const address = input.cryptoPayoutAddress?.trim();

      if (!symbol || !network) {
        throw new BadRequestException('Select an asset and network.');
      }
      if (!address) {
        throw new BadRequestException('Enter a destination wallet address.');
      }

      const { data: asset, error } = await client
        .from('crypto_assets')
        .select('id')
        .eq('symbol', symbol)
        .eq('network', network)
        .maybeSingle();

      if (error || !asset) {
        throw new BadRequestException('That asset/network is not supported.');
      }

      // Early, friendly balance check against the REAL held crypto_wallets
      // balance for this symbol - CryptoWalletService.debitWallet re-checks
      // this authoritatively once the withdrawal is created (see below).
      const cryptoBalance = await this.cryptoWalletService.getBalance(
        client,
        user.id,
        symbol,
      );
      if (cryptoBalance < amount) {
        throw new BadRequestException(
          `Insufficient ${symbol} balance for this withdrawal.`,
        );
      }

      cryptoSymbol = symbol;
      row.crypto_asset_id = asset.id;
      row.crypto_payout_address = address;
    } else {
      throw new BadRequestException('Unsupported withdrawal method.');
    }

    const { data, error } = await client
      .from('withdrawals')
      .insert(row)
      .select('id, amount, method, status, created_at')
      .single();

    if (error || !data) {
      throw new BadRequestException(
        'Could not submit your withdrawal request.',
      );
    }

    // The funds are reserved the moment the request exists, not at
    // markPaid: both ledgers are the single source of truth
    // (docs/database-schema.md), so a requested-but-unprocessed withdrawal
    // must already be reflected in the user's balance, otherwise they could
    // submit several withdrawal requests against the same balance before
    // any of them are processed. The debit call re-checks the balance
    // authoritatively (the check above is only a friendly early-exit, not
    // a race guard). If the debit fails for any reason, the withdrawal row
    // is rolled back so a "requested" withdrawal never exists without its
    // funds actually reserved.
    try {
      if (cryptoSymbol) {
        await this.cryptoWalletService.debitWallet(
          client,
          user.id,
          cryptoSymbol,
          amount,
          'withdrawal',
          { withdrawalId: data.id as string },
        );
      } else {
        await this.walletService.debitStandaloneWallet(
          client,
          user.id,
          currency!,
          amount,
          data.id as string,
        );
      }
    } catch (debitError) {
      await client.from('withdrawals').delete().eq('id', data.id);
      throw debitError;
    }

    // Crypto Withdrawal Processing email (docs/email-templates.md #16):
    // only when this request actually skipped straight to 'processing'
    // (rule 18b's default) - if platform_settings has been flipped back to
    // approval-required, the request lands as 'requested' instead and this
    // isn't the right email for that path. A failed send is non-critical,
    // the withdrawal itself already succeeded.
    if (
      input.method === 'crypto' &&
      data.status === 'processing' &&
      user.email
    ) {
      try {
        await this.notificationsService.sendCryptoWithdrawalProcessingEmail({
          email: user.email,
          name:
            (user.user_metadata?.full_name as string | undefined) ?? 'there',
          amount: String(amount),
          asset: input.cryptoSymbol!.trim().toUpperCase(),
        });
      } catch {
        // Already logged by NotificationsService.send().
      }
    }

    // Withdrawal Requested email (docs/email-templates.md #6): fires for the
    // 'requested' status path - bank/paypal always land here, and crypto
    // does too when platform_settings.crypto_withdrawal_requires_approval is
    // on. A failed send is non-critical, the withdrawal itself already
    // succeeded.
    if (data.status === 'requested' && user.email) {
      try {
        await this.notificationsService.sendWithdrawalRequestedEmail({
          email: user.email,
          name:
            (user.user_metadata?.full_name as string | undefined) ?? 'there',
          amount: String(amount),
          method: this.formatMethod(input.method),
        });
      } catch {
        // Already logged by NotificationsService.send().
      }
    }

    return data;
  }

  private formatMethod(method: WithdrawalMethod): string {
    if (method === 'bank_transfer') return 'bank transfer';
    if (method === 'paypal') return 'PayPal';
    return 'crypto';
  }

  // Rule 18b: bank/PayPal always start requested, awaiting admin review.
  // Crypto skips straight to processing by default, since the user
  // supplied their own destination address and already passed PIN
  // verification, there's no admin approval decision left to make, unless
  // an admin has flipped platform_settings.crypto_withdrawal_requires_approval
  // back on.
  private async statusForMethod(
    client: ReturnType<SupabaseService['getClient']>,
    method: WithdrawalMethod,
  ): Promise<string> {
    if (method !== 'crypto') return 'requested';

    const { data } = await client
      .from('platform_settings')
      .select('value')
      .eq('key', CRYPTO_APPROVAL_SETTING_KEY)
      .maybeSingle();

    return data?.value === 'true' ? 'requested' : 'processing';
  }
}
