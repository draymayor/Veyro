import { loadConfig } from "./config";
import { createSupabaseClient } from "./supabase-client";
import { SecretManagerClient } from "./secret-manager";
import { ThresholdService } from "./thresholds";
import { PriceFeed } from "./price-feed";
import { SweepLogRepository } from "./sweep-log";
import { SweepRunner } from "./sweep-runner";
import { buildAdapter } from "./chains/registry";
import { TatumUtxoProvider } from "./chains/utxo-tatum-provider";
import { UtxoProvider } from "./chains/utxo";

/**
 * Cloud Run Job entrypoint - runs once to completion and exits, unlike
 * apps/api which is a long-running service. Invoked by one of two Cloud
 * Scheduler jobs (12h for the utxo group, 6h for the evm group; see
 * scripts/gcp/bootstrap-sweeper-iam.sh) with SWEEP_GROUP set accordingly.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const supabase = createSupabaseClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
  );
  const secrets = new SecretManagerClient(config.gcpProjectId);
  const thresholds = new ThresholdService(supabase);
  const priceFeed = new PriceFeed(process.env.COINGECKO_API_KEY);
  const sweepLog = new SweepLogRepository(supabase);

  const tatumApiKey = process.env.TATUM_API_KEY ?? "";
  const utxoProviders: Record<string, UtxoProvider> = {
    Bitcoin: new TatumUtxoProvider("bitcoin", tatumApiKey),
    Litecoin: new TatumUtxoProvider("litecoin", tatumApiKey),
    Dogecoin: new TatumUtxoProvider("dogecoin", tatumApiKey),
  };

  const runner = new SweepRunner(
    supabase,
    thresholds,
    priceFeed,
    sweepLog,
    (chain) => buildAdapter(chain, config, secrets, utxoProviders),
    config.dryRun,
  );

  console.log(
    `[sweeper] starting run: group=${config.sweepGroup} dryRun=${config.dryRun}`,
  );
  await runner.run(config.sweepGroup);
  console.log("[sweeper] run complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[sweeper] run failed:", err);
    process.exit(1);
  });
