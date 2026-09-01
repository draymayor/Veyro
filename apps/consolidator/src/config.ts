function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export interface ConsolidatorConfig {
  /**
   * When true, reads ready_to_sign withdrawals and logs what WOULD be
   * signed/broadcast without ever claiming a row (crypto_signing_status is
   * never touched) or deriving any key material. Always run a batch of dry
   * runs after any change to this job before letting a real manual
   * invocation go live - see apps/sweeper/README.md's "Verifying before
   * production" section for the same discipline applied to the sweeper.
   */
  dryRun: boolean;
  gcpProjectId: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** RPC endpoints per EVM network label, e.g. { ERC20: 'https://...' } - same env var convention as apps/sweeper's config.ts. */
  evmRpcUrls: Record<string, string>;
}

export function loadConfig(): ConsolidatorConfig {
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
    dryRun: process.env.CONSOLIDATOR_DRY_RUN === "true",
    gcpProjectId: requireEnv("GCP_PROJECT_ID"),
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    evmRpcUrls,
  };
}
