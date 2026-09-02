import { SupabaseClient } from "@supabase/supabase-js";

export interface WithdrawalSigningLogEntry {
  withdrawalId: string;
  chain: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  feeEstimate?: number;
  txHash?: string;
  status: "success" | "failed";
  failureReason?: string;
}

/**
 * Append-only audit trail for the consolidator - one row per signing
 * attempt (docs/database-schema.md's withdrawal_signing_log section).
 * Deliberately separate from apps/sweeper's SweepLogRepository/sweep_log:
 * this is the outbound direction (consolidation wallet -> user payout
 * address), sweep_log is inbound (user deposit address -> consolidation
 * wallet) - reusing it would put from_address/to_address backwards.
 */
export class WithdrawalSigningLogRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async record(entry: WithdrawalSigningLogEntry): Promise<void> {
    const { error } = await this.supabase
      .from("withdrawal_signing_log")
      .insert({
        withdrawal_id: entry.withdrawalId,
        chain: entry.chain,
        from_address: entry.fromAddress,
        to_address: entry.toAddress,
        amount: entry.amount,
        fee_estimate: entry.feeEstimate ?? null,
        tx_hash: entry.txHash ?? null,
        status: entry.status,
        failure_reason: entry.failureReason ?? null,
      });

    if (error) {
      // Logging failure should never crash the run itself - the on-chain
      // action (or lack of it) already happened; losing the audit row is
      // bad but shouldn't cascade into losing the rest of the batch. Still
      // logged loudly to stdout so it isn't silently lost from Cloud Run's
      // own logs.
      console.error(
        `Failed to write withdrawal_signing_log row: ${error.message}`,
        entry,
      );
    }
  }
}
