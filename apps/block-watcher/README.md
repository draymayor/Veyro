# block-watcher

Strategy 3: a self-hosted block-watcher for crypto deposit detection,
running **alongside** the existing Tatum/Alchemy webhooks, not replacing
them. For any address that already has real Tatum/Alchemy webhook coverage
(at most 9 network-slots total, see `apps/api/src/crypto-addresses/chain-config.ts`),
both systems watch it independently - genuine redundancy, not a
fallback-only relationship. For every other address (the vast majority),
this is the ONLY detection mechanism.

Deliberately a separate deployable from `apps/api`, same posture as
`apps/sweeper`/`apps/consolidator` - own image, own dependency tree, own
service account - with one structural difference: **this is a Cloud Run
SERVICE, not a Job**. It holds persistent WebSocket connections and poll
loops, so it must stay running (`--min-instances=1 --max-instances=1
--no-cpu-throttle`, see `.github/workflows/block-watcher-deploy.yml`)
rather than run-to-completion-and-exit.

## How it detects a deposit

- **7 EVM chains** (ERC20, BEP20, Polygon, Avalanche, Arbitrum, Optimism,
  Base) via a live WebSocket subscription to PublicNode's free `wss://`
  endpoints (`eth_subscribe("newHeads")` under the hood, via ethers'
  `WebSocketProvider`) - confirmed live with a real WS upgrade (HTTP 101)
  against each one, 2026-09-07.
- **7 long-tail EVM chains** (Celo, Flare, Fantom, Cronos, Ethereum Classic,
  Kaia, XDC Network) via polling `eth_blockNumber` on each chain's own free
  public RPC - no free WS provider was found for these (PublicNode 404s on
  Fantom, for example - verified live, not assumed from a search result that
  turned out to be wrong).
- **TRON** via polling TronGrid's free REST API - no provider offers a WS
  block/event subscription for TRON at all (confirmed, not a TronGrid-only
  gap).
- **Bitcoin/Litecoin/Dogecoin** via polling BlockCypher's free tier
  (GET-only - WebHooks/WebSockets are paid-only on BlockCypher, confirmed
  live 2026-09-07).

Every chain family funnels into the same downstream path: a match against
the in-memory address hash map (refreshed from `user_crypto_addresses`
every `ADDRESS_MAP_REFRESH_MS`, default 60s) gets posted, HMAC-signed, to
`apps/api`'s `POST /webhooks/block-watcher`, which calls the exact same
`DepositDetectionService.recordDetectedDeposit()` the Tatum and Alchemy
webhooks already use - one source of truth for the
crediting/dedupe/notification logic, three callers. Two detections of the
same tx (from block-watcher and an existing webhook) are naturally
deduped by the existing `UNIQUE(network, tx_hash, address)` constraint;
nothing new was needed for that.

## Known open items - read before relying on this for real funds

- **TRON payload shape is unverified against a live capture** (see
  `src/chains/tron-watcher.ts`'s doc comment) - based on TronGrid's
  published docs only. Diff the first real detection against this before
  trusting it for auto-crediting.
- **Bitcoin mainnet's real tx/block volume (2,000-4,000+) exceeds what
  BlockCypher's free tier (100 req/hr) can fully fetch per block** - see
  `src/chains/utxo-watcher.ts`'s `MAX_TX_FETCHES_PER_POLL` comment. Litecoin
  and Dogecoin are fine at their real volumes; Bitcoin coverage is partial
  under load and logs loudly when it truncates a block.
- **The 7 long-tail EVM chains' public RPC URLs** (`block-watcher-deploy.yml`'s
  `env_vars`) were sourced during design research, not independently
  live-verified the way the WS endpoints and BlockCypher were - confirm each
  with a plain `eth_chainId` call before trusting it.
- **EVM token contract addresses** (`src/chain-config.ts`'s
  `tokenContracts`) are copied from `apps/sweeper/src/chains/registry.ts`,
  which itself flags them as unverified placeholders pending a real
  block-explorer cross-check.

## One-time GCP setup (manual, not scripted here)

Unlike `apps/sweeper` (see its own README + `scripts/gcp/bootstrap-sweeper-iam.sh`),
no bootstrap script exists yet for this service - it needs, by hand, before
the first deploy:

1. A dedicated service account (`GCP_BLOCK_WATCHER_RUNTIME_SERVICE_ACCOUNT`)
   with `secretmanager.secretAccessor` on `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and `BLOCK_WATCHER_SHARED_SECRET` only - no
   master-seed access, block-watcher never signs anything.
2. `BLOCK_WATCHER_SHARED_SECRET` generated once (a long random value) and
   stored as a Secret Manager secret readable by BOTH this service account
   and `apps/api`'s own runtime service account (see `api-deploy.yml`).
3. The Cloud Run **service** resource itself (`gcloud run deploy` handles
   creation on first push via `deploy-cloudrun`, unlike sweeper's
   `gcloud run jobs update`, which requires the job to pre-exist).
