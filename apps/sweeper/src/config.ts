import { SweepGroup } from "./coins";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export interface SweeperConfig {
  sweepGroup: SweepGroup;
  dryRun: boolean;
  gcpProjectId: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** RPC endpoints per EVM network label, e.g. { ERC20: 'https://...' }. */
  evmRpcUrls: Record<string, string>;
}

// SWEEP_GROUP selects which of the two Cloud Scheduler triggers invoked
// this run (docs/planning-history.md's Sweeper section: 12h for UTXO
// chains, 6h for everything else) - the job image is identical for both,
// only this env var differs between the two Scheduler job definitions.
export function loadConfig(): SweeperConfig {
  const sweepGroup = requireEnv("SWEEP_GROUP");
  if (sweepGroup !== "utxo" && sweepGroup !== "evm") {
    throw new Error(`SWEEP_GROUP must be "utxo" or "evm", got "${sweepGroup}"`);
  }

  const evmRpcUrls: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    const match = /^EVM_RPC_URL_(.+)$/.exec(key);
    if (match && value) {
      // Env var names can't hold spaces; network labels can (e.g. "XDC
      // Network") - underscores in the suffix map back to spaces.
      evmRpcUrls[match[1].replace(/_/g, " ")] = value;
    }
  }

  return {
    sweepGroup,
    dryRun: process.env.SWEEP_DRY_RUN === "true",
    gcpProjectId: requireEnv("GCP_PROJECT_ID"),
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    evmRpcUrls,
  };
}
