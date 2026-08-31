import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export type CryptoWalletTransactionType =
  | 'deposit'
  | 'sell_conversion_debit'
  | 'withdrawal'
  | 'admin_credit'
  | 'admin_debit';

export interface CryptoWalletResult {
  balanceAfter: number;
  cryptoWalletTransactionId: string;
}

type Client = ReturnType<SupabaseService['getClient']>;

/**
 * Real held per-user crypto balances (docs/database-schema.md's
 * crypto_wallets/crypto_wallet_transactions, product-rules.md rules 6a/16).
 * Mirrors WalletService's find-or-create/append-ledger/reconcile-balance
 * shape exactly, but keyed by user_id + symbol directly rather than a
 * wallet_id FK - there's no multi-row-per-user concept here beyond one row
 * per symbol, so there's nothing an extra id indirection would buy.
 *
 * A confirmed crypto deposit (CryptoDepositsService, admin-confirmed per
 * the hybrid webhook/manual model) credits this and never touches the
 * fiat `wallets` table at all. Selling (TradesService's instant sell-crypto
 * conversion) debits this and credits `wallets` in the same action. A
 * crypto withdrawal (WithdrawalsService) debits this directly, never the
 * fiat wallet, since crypto withdrawals send held crypto, not fiat.
 */
@Injectable()
export class CryptoWalletService {
  async getBalance(
    client: Client,
    userId: string,
    symbol: string,
  ): Promise<number> {
    const { data } = await client
      .from('crypto_wallets')
      .select('balance')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .maybeSingle();

    return Number(data?.balance ?? 0);
  }

  async creditWallet(
    client: Client,
    userId: string,
    symbol: string,
    amount: number,
    type: 'deposit' | 'admin_credit',
    related?: { tradeId?: string; withdrawalId?: string },
  ): Promise<CryptoWalletResult> {
    const wallet = await this.findOrCreateWallet(client, userId, symbol);
    const balanceAfter = Number(wallet.balance) + amount;

    const cryptoWalletTransactionId = await this.insertLedgerRow(client, {
      userId,
      symbol,
      type,
      amount,
      balanceAfter,
      related,
    });

    await this.reconcileBalance(client, userId, symbol, balanceAfter);

    return { balanceAfter, cryptoWalletTransactionId };
  }

  // Throws BadRequestException if the symbol balance can't cover the debit -
  // callers must not swallow this, it's the only real balance check for a
  // sell/withdrawal of held crypto.
  async debitWallet(
    client: Client,
    userId: string,
    symbol: string,
    amount: number,
    type: 'sell_conversion_debit' | 'withdrawal' | 'admin_debit',
    related?: { tradeId?: string; withdrawalId?: string },
  ): Promise<CryptoWalletResult> {
    const wallet = await this.findOrCreateWallet(client, userId, symbol);
    const balanceAfter = Number(wallet.balance) - amount;

    if (balanceAfter < 0) {
      throw new BadRequestException(`Insufficient ${symbol} balance.`);
    }

    const cryptoWalletTransactionId = await this.insertLedgerRow(client, {
      userId,
      symbol,
      type,
      amount,
      balanceAfter,
      related,
    });

    await this.reconcileBalance(client, userId, symbol, balanceAfter);

    return { balanceAfter, cryptoWalletTransactionId };
  }

  private async findOrCreateWallet(
    client: Client,
    userId: string,
    symbol: string,
  ): Promise<{ balance: number }> {
    const { data: wallet } = await client
      .from('crypto_wallets')
      .select('balance')
      .eq('user_id', userId)
      .eq('symbol', symbol)
      .maybeSingle();

    if (wallet) return wallet;

    const { data: created, error } = await client
      .from('crypto_wallets')
      .insert({ user_id: userId, symbol, balance: 0 })
      .select('balance')
      .single();

    if (error || !created) {
      throw new Error(
        `Could not create a ${symbol} crypto wallet for this user.`,
      );
    }

    return created;
  }

  private async insertLedgerRow(
    client: Client,
    row: {
      userId: string;
      symbol: string;
      type: CryptoWalletTransactionType;
      amount: number;
      balanceAfter: number;
      related?: { tradeId?: string; withdrawalId?: string };
    },
  ): Promise<string> {
    const { data, error } = await client
      .from('crypto_wallet_transactions')
      .insert({
        user_id: row.userId,
        symbol: row.symbol,
        type: row.type,
        amount: row.amount,
        balance_after: row.balanceAfter,
        related_trade_id: row.related?.tradeId ?? null,
        related_withdrawal_id: row.related?.withdrawalId ?? null,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ?? 'Could not record the crypto ledger entry.',
      );
    }

    return data.id as string;
  }

  private async reconcileBalance(
    client: Client,
    userId: string,
    symbol: string,
    balanceAfter: number,
  ): Promise<void> {
    const { error } = await client
      .from('crypto_wallets')
      .update({ balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('symbol', symbol);

    if (error) throw new Error(error.message);
  }
}
