import { loadConfig } from "./config";
import { createSupabaseClient } from "./supabase-client";
import { SecretManagerClient } from "./secret-manager";
import { WithdrawalSigningLogRepository } from "./withdrawal-signing-log";
import { ConsolidatorRunner } from "./consolidator-runner";
import { buildAdapter } from "./chains/registry";
import { TatumUtxoProvider } from "./chains/utxo-tatum-provider";
import { UtxoProvider } from "./chains/utxo";

const CONSOLIDATION_MASTER_SEED_SECRET = "CONSOLIDATION_MASTER_SEED";

/**
 * Cloud Run Job entrypoint - runs once to completion and exits, same
 * pattern as apps/sweeper. Unlike the sweeper, this is NOT invoked by a
 * Cloud Scheduler job - deliberately manual only
 * (`gcloud run jobs execute veyro-consolidator`), per the reviewed design:
 * signing a real outbound transaction should always be a deliberate,
 * human-triggered action, not a routine cron.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const supabase = createSupabaseClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
  );
  const secrets = new SecretManagerClient(config.gcpProjectId);
  const signingLog = new WithdrawalSigningLogRepository(supabase);

  const tatumApiKey = process.env.TATUM_API_KEY ?? "";
  const utxoProviders: Record<"BTC" | "LTC" | "DOGE", UtxoProvider> = {
    BTC: new TatumUtxoProvider("bitcoin", tatumApiKey),
    LTC: new TatumUtxoProvider("litecoin", tatumApiKey),
    DOGE: new TatumUtxoProvider("dogecoin", tatumApiKey),
  };

  const runner = new ConsolidatorRunner(
    supabase,
    signingLog,
    async (chain, networkCode) => {
      // Fetched lazily, once per run (cached by SecretManagerClient) - only
      // when there's at least one ready_to_sign withdrawal to process, so a
      // run that finds nothing to do never touches this secret at all.
      const masterSeed = await secrets.getSecret(
        CONSOLIDATION_MASTER_SEED_SECRET,
      );
      return buildAdapter(
        chain,
        networkCode,
        config,
        masterSeed,
        utxoProviders,
      );
    },
    config.dryRun,
  );

  console.log(`[consolidator] starting run: dryRun=${config.dryRun}`);
  await runner.run();
  console.log("[consolidator] run complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[consolidator] run failed:", err);
    process.exit(1);
  });
