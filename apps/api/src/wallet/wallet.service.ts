import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface WalletCreditResult {
  walletId: string;
  walletTransactionId: string;
  balanceAfter: number;
}

/**
 * Shared find-or-create-wallet, append-ledger-row, reconcile-cached-balance
 * primitives. wallet_transactions is append-only (docs/database-schema.md),
 * and wallets.balance is only ever written here to reconcile it to the
 * ledger, never edited directly anywhere else.
 *
 * creditStandaloneWallet: referral bonuses and the admin Manual Deposit
 * feature call this with no linkage (both trade_id and withdrawal_id stay
 * null on the ledger row). The withdrawal-failure reversal in
 * admin-withdrawals.service.ts also calls this, but passes withdrawalId so
 * the credit-back stays attributed to the withdrawal it's reversing rather
 * than reading as an unexplained manual deposit. The instant Sell Crypto
 * conversion (TradesService) passes tradeId so the fiat credit stays
 * attributed to the sell trade it resulted from, same reasoning.
 *
 * debitStandaloneWallet: withdrawals.service.ts calls this at withdrawal
 * REQUEST time to reserve the funds immediately (docs/database-schema.md's
 * wallet_transactions is the single source of truth ledger; before this,
 * nothing ever wrote a debit row or lowered wallets.balance for a
 * withdrawal at all). Always called with a withdrawalId, since a debit with
 * no reason attached would be meaningless on the ledger. Throws
 * BadRequestException if the wallet doesn't have enough balance to cover
 * the debit; this is the only real balance check anywhere in the
 * withdrawal flow, so callers must not swallow this error.
 */
@Injectable()
export class WalletService {
  async creditStandaloneWallet(
    client: ReturnType<SupabaseService['getClient']>,
    userId: string,
    currency: string,
    amount: number,
    withdrawalId?: string,
    tradeId?: string,
  ): Promise<WalletCreditResult> {
    const wallet = await this.findOrCreateWallet(client, userId, currency);
    const newBalance = Number(wallet.balance) + amount;

    const walletTransactionId = await this.insertLedgerRow(client, {
      walletId: wallet.id,
      type: 'credit',
      amount,
      balanceAfter: newBalance,
      withdrawalId,
      tradeId,
    });

    await this.reconcileBalance(client, wallet.id, newBalance);

    return {
      walletId: wallet.id,
      walletTransactionId,
      balanceAfter: newBalance,
    };
  }

  async debitStandaloneWallet(
    client: ReturnType<SupabaseService['getClient']>,
    userId: string,
    currency: string,
    amount: number,
    withdrawalId: string,
  ): Promise<WalletCreditResult> {
    const wallet = await this.findOrCreateWallet(client, userId, currency);
    const newBalance = Number(wallet.balance) - amount;

    if (newBalance < 0) {
      throw new BadRequestException('Insufficient wallet balance.');
    }

    const walletTransactionId = await this.insertLedgerRow(client, {
      walletId: wallet.id,
      type: 'debit',
      amount,
      balanceAfter: newBalance,
      withdrawalId,
    });

    await this.reconcileBalance(client, wallet.id, newBalance);

    return {
      walletId: wallet.id,
      walletTransactionId,
      balanceAfter: newBalance,
    };
  }

  private async findOrCreateWallet(
    client: ReturnType<SupabaseService['getClient']>,
    userId: string,
    currency: string,
  ): Promise<{ id: string; balance: number }> {
    const { data: wallet } = await client
      .from('wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .eq('currency', currency)
      .maybeSingle();

    if (wallet) return wallet;

    const { data: created, error: createError } = await client
      .from('wallets')
      .insert({ user_id: userId, currency, balance: 0 })
      .select('id, balance')
      .single();

    if (createError || !created) {
      throw new Error('Could not create a wallet for this user.');
    }

    return created;
  }

  private async insertLedgerRow(
    client: ReturnType<SupabaseService['getClient']>,
    row: {
      walletId: string;
      type: 'credit' | 'debit';
      amount: number;
      balanceAfter: number;
      withdrawalId?: string;
      tradeId?: string;
    },
  ): Promise<string> {
    const { data: ledgerRow, error: ledgerError } = await client
      .from('wallet_transactions')
      .insert({
        wallet_id: row.walletId,
        withdrawal_id: row.withdrawalId ?? null,
        trade_id: row.tradeId ?? null,
        type: row.type,
        amount: row.amount,
        balance_after: row.balanceAfter,
      })
      .select('id')
      .single();

    if (ledgerError || !ledgerRow) {
      throw new Error(
        ledgerError?.message ?? 'Could not record the ledger entry.',
      );
    }

    return ledgerRow.id as string;
  }

  private async reconcileBalance(
    client: ReturnType<SupabaseService['getClient']>,
    walletId: string,
    newBalance: number,
  ): Promise<void> {
    const { error: balanceError } = await client
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', walletId);

    if (balanceError) throw new Error(balanceError.message);
  }
}
