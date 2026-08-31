import { SupabaseClient } from "@supabase/supabase-js";
import { ChainDefinition, chainsForGroup, SweepGroup } from "./coins";
import { ThresholdService } from "./thresholds";
import { SweepLogRepository } from "./sweep-log";
import { ChainAdapter, DepositAddress } from "./chains/types";

interface DepositRow {
  user_id: string;
  symbol: string;
  network: string;
  address: string;
  derivation_index: number | null;
  destination_tag: string | null;
}

export class SweepRunner {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly thresholds: ThresholdService,
    private readonly sweepLog: SweepLogRepository,
    private readonly buildAdapter: (
      chain: ChainDefinition,
    ) => Promise<ChainAdapter>,
    private readonly dryRun: boolean,
  ) {}

  async run(group: SweepGroup): Promise<void> {
    const chains = chainsForGroup(group);
    for (const chain of chains) {
      await this.sweepChain(chain);
    }
  }

  private async getConsolidationWallet(chain: string): Promise<string> {
    const { data, error } = await this.supabase
      .from("consolidation_wallets")
      .select("address, is_active")
      .eq("chain", chain)
      .maybeSingle();

    if (error || !data || !data.is_active) {
      throw new Error(
        `No active consolidation wallet configured for chain "${chain}" - run scripts/gcp/bootstrap-sweeper-iam.sh's wallet provisioning step first.`,
      );
    }
    return data.address as string;
  }

  private async getDepositAddresses(
    network: string,
  ): Promise<DepositAddress[]> {
    const { data, error } = await this.supabase
      .from("user_crypto_addresses")
      .select(
        "user_id, symbol, network, address, derivation_index, destination_tag",
      )
      .eq("network", network);

    if (error) {
      throw new Error(
        `Failed to load deposit addresses for ${network}: ${error.message}`,
      );
    }

    return (data ?? []).map((row: DepositRow) => ({
      userId: row.user_id,
      symbol: row.symbol,
      network: row.network,
      address: row.address,
      derivationIndex: row.derivation_index,
      destinationTag: row.destination_tag,
    }));
  }

  private async sweepChain(chain: ChainDefinition): Promise<void> {
    const toAddress = await this.getConsolidationWallet(chain.network);
    const adapter = await this.buildAdapter(chain);
    const deposits = await this.getDepositAddresses(chain.network);

    // Shared-address chains (none currently active) have every row point at
    // the same platform address, so sweep it once rather than once per user row.
    const uniqueByAddress = new Map<string, DepositAddress>();
    for (const d of deposits) {
      uniqueByAddress.set(`${d.address}:${d.symbol}`, d);
    }

    for (const deposit of uniqueByAddress.values()) {
      await this.sweepOne(chain, adapter, deposit, toAddress);
    }
  }

  private async sweepOne(
    chain: ChainDefinition,
    adapter: ChainAdapter,
    deposit: DepositAddress,
    toAddress: string,
  ): Promise<void> {
    const thresholdKey = chain.thresholdKeyBySymbol[deposit.symbol];
    if (!thresholdKey) return; // symbol not configured for sweeping on this chain

    try {
      const balance = await adapter.getBalance(deposit.address, deposit.symbol);
      const threshold = await this.thresholds.getThreshold(thresholdKey);

      if (balance < threshold) {
        await this.sweepLog.record({
          chain: chain.network,
          sweepGroup: chain.sweepGroup,
          fromAddress: deposit.address,
          toAddress,
          symbol: deposit.symbol,
          amount: balance,
          status: "skipped_below_threshold",
        });
        return;
      }

      if (this.dryRun) {
        await this.sweepLog.record({
          chain: chain.network,
          sweepGroup: chain.sweepGroup,
          fromAddress: deposit.address,
          toAddress,
          symbol: deposit.symbol,
          amount: balance,
          status: "skipped_below_threshold",
          errorMessage: "dry_run: would have swept",
        });
        return;
      }

      const result = await adapter.sweep(deposit, deposit.symbol, toAddress);
      if (!result) {
        await this.sweepLog.record({
          chain: chain.network,
          sweepGroup: chain.sweepGroup,
          fromAddress: deposit.address,
          toAddress,
          symbol: deposit.symbol,
          amount: balance,
          status: "skipped_below_threshold",
          errorMessage: "balance did not clear network fee after estimation",
        });
        return;
      }

      await this.sweepLog.record({
        chain: chain.network,
        sweepGroup: chain.sweepGroup,
        fromAddress: deposit.address,
        toAddress,
        symbol: deposit.symbol,
        amount: result.amountSwept,
        feeEstimate: result.feeEstimate,
        txHash: result.txHash,
        status: "success",
      });
    } catch (err) {
      await this.sweepLog.record({
        chain: chain.network,
        sweepGroup: chain.sweepGroup,
        fromAddress: deposit.address,
        toAddress,
        symbol: deposit.symbol,
        amount: 0,
        status: "failed",
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
