import { SupabaseClient } from "@supabase/supabase-js";
import { SweepGroup } from "./coins";

export interface SweepLogEntry {
  chain: string;
  sweepGroup: SweepGroup;
  fromAddress: string;
  toAddress: string;
  symbol: string;
  amount: number;
  feeEstimate?: number;
  txHash?: string;
  status: "success" | "skipped_below_threshold" | "failed";
  errorMessage?: string;
}

/** Append-only audit trail - one row per sweep attempt (docs/database-schema.md). */
export class SweepLogRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async record(entry: SweepLogEntry): Promise<void> {
    const { error } = await this.supabase.from("sweep_log").insert({
      chain: entry.chain,
      sweep_group: entry.sweepGroup,
      from_address: entry.fromAddress,
      to_address: entry.toAddress,
      symbol: entry.symbol,
      amount: entry.amount,
      fee_estimate: entry.feeEstimate ?? null,
      tx_hash: entry.txHash ?? null,
      status: entry.status,
      error_message: entry.errorMessage ?? null,
    });

    if (error) {
      // Logging failure should never crash the sweep run itself - the
      // on-chain action (or lack of it) already happened; losing the audit
      // row is bad but shouldn't cascade into losing the rest of the batch.

      console.error(`Failed to write sweep_log row: ${error.message}`, entry);
    }
  }
}
