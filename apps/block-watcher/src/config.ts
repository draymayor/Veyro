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
  /**
   * Explicit opt-in, default false: whether to start the BTC/LTC/DOGE
   * watchers at all. Deliberately separate from every other chain family
   * (EVM/TRON always start) - kept as an opt-in even now that the provider
   * question is resolved (see utxo-watcher.ts: Alchemy's Bitcoin JSON-RPC
   * API, confirmed live 2026-09-07 - `getblock` verbosity 2 returns every
   * transaction in a block fully decoded, including output addresses, in
   * one 10-CU request, at ~3.1M CU/month combined for all three chains -
   * comfortably under the 30M/month free tier), so that flipping it on for
   * real funds is still a deliberate, separate decision from deploying this
   * change.
   */
  utxoDetectionEnabled: boolean;
  /**
   * Optional TronGrid API key (from the free tier at
   * https://www.trongrid.io/dashboard). Confirmed live 2026-09-07 in
   * production: unauthenticated requests to api.trongrid.io are capped at
   * 1 req/sec (TronGrid cut this from a higher anonymous limit back in
   * 2023) - tron-watcher.ts's 3s poll interval alone exceeds that, so
   * every single poll cycle 429s without a key. A free key raises this to
   * 15 req/sec, comfortably enough. main.ts only starts watchTron when
   * this is set - undefined means TRON detection is deliberately held off
   * rather than left silently retry-looping against a rate limit it can
   * never clear.
   */
  tronGridApiKey?: string;
  /**
   * Alchemy API key for the BTC/LTC/DOGE watchers (utxo-watcher.ts) - a
   * separate key/app from apps/api's own ALCHEMY_API_KEY (Notify webhooks
   * only), since this is a different deployable with its own service
   * account. Required for UTXO detection to actually start even when
   * utxoDetectionEnabled is true - see main.ts.
   */
  alchemyApiKey?: string;
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
    utxoDetectionEnabled: process.env.UTXO_DETECTION_ENABLED === "true",
    tronGridApiKey: process.env.TRONGRID_API_KEY || undefined,
    alchemyApiKey: process.env.ALCHEMY_API_KEY || undefined,
  };
}
