import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CryptoPriceService } from '../crypto-price/crypto-price.service';

type SupabaseClientType = ReturnType<SupabaseService['getClient']>;

export interface BonusWithdrawalLock {
  /** In the crypto symbol passed to getCryptoBonusWithdrawalLock (USDT). */
  lockedAmount: number;
}

// Ledger types that represent a genuine on-chain deposit landing in the
// user's crypto wallet. 'admin_credit' deliberately excluded - a manual
// admin top-up isn't proof of real crypto movement, which is the entire
// point of gating a bonus on a deposit (see docs/database-schema.md's
// bonus-unlock reasoning). 'reorg_reversal' is a debit, never counted.
const QUALIFYING_DEPOSIT_TYPES = ['deposit', 'webhook_deposit'];

/**
 * Shared "locked floor" mechanic for every bonus program, generalized from
 * ScoutService.getWithdrawalLock - same pattern, same reasoning: a bonus is
 * credited to a wallet the instant it's granted (so the user sees it
 * immediately), but the portion of the balance it represents must stay in
 * that wallet until the user has genuinely earned it, since bonus money
 * and regular money are otherwise indistinguishable once both land in the
 * same wallet.
 *
 * Both bonus programs (Earn pool, Welcome bonus) now settle in a real USDT
 * crypto wallet with no FX conversion (see EarnService.claim and
 * WelcomeBonusService.grantOnSignupComplete) - neither locks the fiat
 * wallet anymore, so there is only the one crypto variant below. Scout's
 * own fiat-wallet lock (ScoutService.getWithdrawalLock) is a separate,
 * unrelated mechanic on the fiat side, not part of this class.
 */
@Injectable()
export class BonusWithdrawalLockService {
  constructor(private readonly cryptoPriceService: CryptoPriceService) {}

  // Crypto-wallet lock: sums both bonus programs' still-locked claims
  // (Earn's still-'claimed' earn_bonus_claims, Welcome's still-'granted'
  // welcome_bonus_claims), each linked via its own crypto_wallet_transaction_id,
  // for the given symbol (USDT) - both credit crypto_wallets directly with
  // no FX conversion.
  async getCryptoBonusWithdrawalLock(
    client: SupabaseClientType,
    userId: string,
    symbol: string,
  ): Promise<BonusWithdrawalLock | null> {
    const [{ data: earnRows }, { data: welcomeRows }] = await Promise.all([
      client
        .from('earn_bonus_claims')
        .select('crypto_wallet_transaction_id')
        .eq('user_id', userId)
        .eq('status', 'claimed'),
      client
        .from('welcome_bonus_claims')
        .select('crypto_wallet_transaction_id')
        .eq('user_id', userId)
        .eq('status', 'granted'),
    ]);

    const cryptoWalletTransactionIds = [
      ...(earnRows ?? []),
      ...(welcomeRows ?? []),
    ]
      .map((row) => row.crypto_wallet_transaction_id as string | null)
      .filter((id): id is string => !!id);

    if (cryptoWalletTransactionIds.length === 0) return null;

    const { data: ledgerRows } = await client
      .from('crypto_wallet_transactions')
      .select('amount')
      .in('id', cryptoWalletTransactionIds)
      .eq('symbol', symbol);

    const lockedAmount = (ledgerRows ?? []).reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    if (lockedAmount <= 0) return null;

    return { lockedAmount };
  }

  // Sums real crypto deposits (crypto_wallet_transactions, deposit/
  // webhook_deposit types only) since sinceIso, converted to USD via live
  // spot prices. Replaces EarnService's old computeTradeVolumeUsd - the
  // unlock condition is now "did the user actually deposit crypto", not
  // trade volume. Deliberately re-queried live each time rather than
  // cached, same posture as the trade-volume version it replaces.
  async computeDepositVolumeUsd(
    client: SupabaseClientType,
    userId: string,
    sinceIso: string,
  ): Promise<number> {
    const { data: txns } = await client
      .from('crypto_wallet_transactions')
      .select('amount, symbol')
      .eq('user_id', userId)
      .in('type', QUALIFYING_DEPOSIT_TYPES)
      .gte('created_at', sinceIso);

    if (!txns?.length) return 0;

    const rates = await this.cryptoPriceService.getRates();

    let totalUsd = 0;
    for (const txn of txns as { amount: number; symbol: string }[]) {
      const priceUsd = rates[txn.symbol]?.priceUsd;
      // No live price for this symbol right now: skip it from this pass
      // rather than guessing. Conservative in the safe direction - this
      // can only delay an unlock, never trigger one early, and gets
      // re-evaluated on the next deposit or page load.
      if (!priceUsd) continue;
      totalUsd += Number(txn.amount) * priceUsd;
    }
    return totalUsd;
  }
}
