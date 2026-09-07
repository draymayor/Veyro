function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

export interface BlockWatcherConfig {
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  /** Base URL of apps/api, e.g. https://api.veyro.example - no trailing slash. */
  apiBaseUrl: string;
  blockWatcherSharedSecret: string;
  /** How often to re-read user_crypto_addresses into the in-memory hash map. */
  addressMapRefreshMs: number;
  /** RPC endpoints per poll-evm network label, e.g. { Fantom: 'https://...' }. */
  evmRpcUrls: Record<string, string>;
}

export function loadConfig(): BlockWatcherConfig {
  const evmRpcUrls: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    const match = /^EVM_RPC_URL_(.+)$/.exec(key);
    if (match && value) {
      // Same convention as apps/sweeper/src/config.ts: env var names can't
      // hold spaces; network labels can (e.g. "XDC Network") - underscores
      // in the suffix map back to spaces.
      evmRpcUrls[match[1].replace(/_/g, " ")] = value;
    }
  }

  return {
    port: Number(process.env.PORT ?? 8080),
    supabaseUrl: requireEnv("SUPABASE_URL"),
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    apiBaseUrl: requireEnv("API_BASE_URL").replace(/\/$/, ""),
    blockWatcherSharedSecret: requireEnv("BLOCK_WATCHER_SHARED_SECRET"),
    addressMapRefreshMs: Number(process.env.ADDRESS_MAP_REFRESH_MS ?? 60_000),
    evmRpcUrls,
  };
}
