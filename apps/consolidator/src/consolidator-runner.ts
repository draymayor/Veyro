import { SupabaseClient } from "@supabase/supabase-js";
import { ConsolidatorChain, chainForNetworkCode } from "./coins";
import { PayoutAdapter } from "./chains/types";
import { WithdrawalSigningLogRepository } from "./withdrawal-signing-log";

interface ReadyWithdrawal {
  id: string;
  amount: number;
  cryptoPayoutAddress: string;
  symbol: string;
  networkCode: string;
}

interface WithdrawalRow {
  id: string;
  amount: number;
  crypto_payout_address: string | null;
  crypto_assets: { symbol: string; network_code: string } | null;
}

export class ConsolidatorRunner {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly log: WithdrawalSigningLogRepository,
    private readonly buildAdapter: (
      chain: ConsolidatorChain,
      networkCode: string,
    ) => Promise<PayoutAdapter>,
    private readonly dryRun: boolean,
  ) {}

  async run(): Promise<void> {
    const withdrawals = await this.getReadyWithdrawals();
    console.log(
      `[consolidator] found ${withdrawals.length} withdrawal(s) at crypto_signing_status='ready_to_sign'`,
    );
    for (const withdrawal of withdrawals) {
      await this.processOne(withdrawal);
    }
  }

  private async getReadyWithdrawals(): Promise<ReadyWithdrawal[]> {
    const { data, error } = await this.supabase
      .from("withdrawals")
      .select(
        "id, amount, crypto_payout_address, crypto_assets(symbol, network_code)",
      )
      .eq("method", "crypto")
      .eq("status", "processing")
      .eq("crypto_signing_status", "ready_to_sign");

    if (error) {
      throw new Error(
        `Failed to load ready-to-sign withdrawals: ${error.message}`,
      );
    }

    const rows = (data ?? []) as unknown as WithdrawalRow[];
    return rows.flatMap((row): ReadyWithdrawal[] => {
      if (!row.crypto_payout_address || !row.crypto_assets) {
        console.error(
          `[consolidator] withdrawal ${row.id} is missing crypto_payout_address or crypto_assets join - skipping, this indicates corrupt data, not a normal state`,
        );
        return [];
      }
      return [
        {
          id: row.id,
          amount: row.amount,
          cryptoPayoutAddress: row.crypto_payout_address,
          symbol: row.crypto_assets.symbol,
          networkCode: row.crypto_assets.network_code,
        },
      ];
    });
  }

  /**
   * Atomic claim: the WHERE clause only matches a row still at
   * 'ready_to_sign', so if two runs (or a re-run against a row already
   * mid-flight) race for the same withdrawal, exactly one UPDATE returns a
   * row - this IS the double-spend/double-sign lock, not just a status
   * label. Postgres's own row-level locking under an UPDATE makes this
   * safe without any additional application-level locking.
   */
  private async claim(id: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("withdrawals")
      .update({ crypto_signing_status: "signing" })
      .eq("id", id)
      .eq("crypto_signing_status", "ready_to_sign")
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to claim withdrawal ${id}: ${error.message}`);
    }
    return !!data;
  }

  private async markSigned(id: string, txHash: string): Promise<void> {
    const { error } = await this.supabase
      .from("withdrawals")
      .update({
        crypto_signing_status: "signed",
        status: "paid",
        transaction_reference: txHash,
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("crypto_signing_status", "signing");

    if (error) {
      // The on-chain send already happened - losing this write would leave
      // the row stuck at 'signing' looking like an unresolved crash, when
      // it actually succeeded. Loud, not silent.
      console.error(
        `[consolidator] CRITICAL: broadcast succeeded (tx=${txHash}) but failed to mark withdrawal ${id} 'signed': ${error.message}. This withdrawal is stuck at 'signing' despite having actually been sent - resolve manually, do not re-run the job against it.`,
      );
    }
  }

  private async markSignFailed(id: string): Promise<void> {
    // Safe to release back to 'ready_to_sign'-equivalent handling: this is
    // only ever called for the pre-signing solvency-check failure, which by
    // construction happens before any key material is derived or any
    // signing/broadcast is attempted. status stays 'processing' throughout.
    const { error } = await this.supabase
      .from("withdrawals")
      .update({ crypto_signing_status: "sign_failed" })
      .eq("id", id)
      .eq("crypto_signing_status", "signing");

    if (error) {
      console.error(
        `[consolidator] failed to mark withdrawal ${id} 'sign_failed': ${error.message}`,
      );
    }
  }

  private async getConsolidationWallet(
    chain: ConsolidatorChain,
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("consolidation_wallets")
      .select("address, is_active")
      .eq("chain", chain)
      .maybeSingle();

    if (error || !data || !data.is_active) {
      throw new Error(
        `No active consolidation wallet configured for chain "${chain}" - see apps/sweeper/README.md's "Provisioning consolidation wallets" section.`,
      );
    }
    return data.address as string;
  }

  private async processOne(withdrawal: ReadyWithdrawal): Promise<void> {
    let chain: ConsolidatorChain;
    try {
      chain = chainForNetworkCode(withdrawal.networkCode);
    } catch (err) {
      console.error(
        `[consolidator] withdrawal ${withdrawal.id}: ${(err as Error).message}`,
      );
      return;
    }

    if (this.dryRun) {
      const wallet = await this.getConsolidationWallet(chain).catch(
        () => "(no active consolidation wallet configured)",
      );
      console.log(
        `[dry run] would pay out ${withdrawal.amount} ${withdrawal.symbol} (${withdrawal.networkCode}) from ${wallet} to ${withdrawal.cryptoPayoutAddress} for withdrawal ${withdrawal.id} - crypto_signing_status NOT touched.`,
      );
      return;
    }

    const claimed = await this.claim(withdrawal.id);
    if (!claimed) {
      console.log(
        `[consolidator] withdrawal ${withdrawal.id} was already claimed by another run - skipping.`,
      );
      return;
    }

    let fromAddress = "(unknown - failed before adapter was built)";
    try {
      const wallet = await this.getConsolidationWallet(chain);
      const adapter = await this.buildAdapter(chain, withdrawal.networkCode);
      fromAddress = adapter.fromAddress;

      if (adapter.fromAddress !== wallet) {
        // The derived address should always equal what's stored in
        // consolidation_wallets - see scripts/verify-consolidator-derivation.js.
        // A mismatch here means either the DB row or the derivation path has
        // drifted since that verification, which is exactly the class of bug
        // this check exists to catch before ever broadcasting anything.
        throw new Error(
          `Derived ${chain} address ${adapter.fromAddress} does not match consolidation_wallets.address ${wallet} - refusing to sign. Re-run scripts/verify-consolidator-derivation.js before touching this chain again.`,
        );
      }

      const result = await adapter.payout(
        withdrawal.symbol,
        withdrawal.amount,
        withdrawal.cryptoPayoutAddress,
      );

      if (!result.ok) {
        // Pre-signing solvency check failed - nothing was signed or
        // broadcast, safe to record as a clean, retryable failure.
        await this.markSignFailed(withdrawal.id);
        await this.log.record({
          withdrawalId: withdrawal.id,
          chain,
          fromAddress,
          toAddress: withdrawal.cryptoPayoutAddress,
          amount: withdrawal.amount,
          feeEstimate: result.feeEstimate,
          status: "failed",
          failureReason: `${result.reason}: ${result.message}`,
        });
        console.error(
          `[consolidator] withdrawal ${withdrawal.id} sign_failed (safe, not broadcast): ${result.message}`,
        );
        return;
      }

      await this.markSigned(withdrawal.id, result.txHash);
      await this.log.record({
        withdrawalId: withdrawal.id,
        chain,
        fromAddress,
        toAddress: withdrawal.cryptoPayoutAddress,
        amount: withdrawal.amount,
        feeEstimate: result.feeEstimate,
        txHash: result.txHash,
        status: "success",
      });
      console.log(
        `[consolidator] withdrawal ${withdrawal.id} signed and broadcast: tx=${result.txHash}`,
      );
    } catch (err) {
      // Anything thrown here happened either before the solvency check
      // (safe - e.g. couldn't fetch a consolidation wallet row, couldn't
      // build the adapter) or, worse, from inside an adapter's payout()
      // AFTER the solvency check passed, meaning signing/broadcast was
      // attempted and its outcome is ambiguous from a thrown error alone.
      // There is no way to distinguish those two cases generically here,
      // so per the reviewed design this withdrawal is deliberately left at
      // crypto_signing_status='signing' rather than guessed back to either
      // 'ready_to_sign' (risking a double-send if the broadcast actually
      // succeeded) or 'sign_failed' (implying it's safe to just retry,
      // which it might not be). A human must check the chain for
      // fromAddress -> withdrawal.cryptoPayoutAddress before resolving
      // this withdrawal one way or the other.
      const message = err instanceof Error ? err.message : String(err);
      await this.log.record({
        withdrawalId: withdrawal.id,
        chain,
        fromAddress,
        toAddress: withdrawal.cryptoPayoutAddress,
        amount: withdrawal.amount,
        status: "failed",
        failureReason: `left at crypto_signing_status='signing' for manual review, cause was NOT necessarily a clean pre-broadcast failure: ${message}`,
      });
      console.error(
        `[consolidator] withdrawal ${withdrawal.id} hit an unexpected error and is left at 'signing' - requires MANUAL on-chain verification before resolving, do not re-run this job against it blindly:`,
        err,
      );
    }
  }
}
