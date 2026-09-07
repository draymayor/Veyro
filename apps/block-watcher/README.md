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

All four items below were re-checked against live evidence on 2026-09-07
(real TronGrid captures, real BlockCypher blocks, real `eth_chainId` calls,
real on-chain `symbol()`/`decimals()` reads via Alchemy + public RPCs).
Three came back confirmed; one (Bitcoin/BlockCypher) came back worse than
originally documented and still needs a decision, not just verification.

- **TRON payload shape: CONFIRMED against a live capture.** A real
  `getnowblock`/`getblockbynum`/`gettransactioninfobyblocknum` round trip
  against TronGrid mainnet matched `tron-watcher.ts`'s assumed shape
  exactly - `block_header.raw_data.number`, `transactions[].txID`,
  `raw_data.contract[0].type === "TransferContract"` with
  `parameter.value.{owner_address,to_address,amount}` for native TRX, and
  for TRC20, `info.id`, `log[].address` (hex, no `41` prefix - confirmed
  live, not just documented), `log[].topics[0]` matching
  `TRANSFER_TOPIC_NO_PREFIX` byte-for-byte, and `log[].data` as an unprefixed
  hex value. The captured block happened to contain a real Transfer event
  from the official USDT contract itself (topics/address decoded back to
  `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` via `triggerconstantcontract`), so
  this wasn't just a shape match but an actual live USDT transfer parsed
  correctly end to end. No code change needed.
- **Bitcoin mainnet vs. BlockCypher's free tier: confirmed worse than
  documented, not yet resolved.** Real recent BTC blocks ran 3,702-7,276
  tx (sampled live via BlockCypher itself) - higher than this doc's old
  "2,000-4,000+" estimate. BlockCypher's current docs confirm the 100
  req/hr free-tier cap. But the bigger issue isn't `MAX_TX_FETCHES_PER_POLL`
  truncating large blocks - it's that `watchUtxo`'s height-check poll
  (`GET /{chain}/main` every `POLL_INTERVAL_MS` = 45s) runs unconditionally
  for BTC, LTC, and DOGE independently, at 80 requests/hr each = 240/hr
  combined, already 2.4x the shared free-tier budget before a single block
  or tx-detail request is made. (BlockCypher's docs describe the 100/hr cap
  as a property of the free tier generally, not disambiguated per chain
  path; unauthenticated requests have no per-chain token to separate them
  by, so treat it as shared until proven otherwise.) This means all three
  UTXO chains are at real risk of 429s from baseline polling alone, not
  just Bitcoin from tx volume - **still needs a decision**: a paid
  BlockCypher tier, a different/self-hosted provider, or accepting
  degraded coverage across all three UTXO chains (not just Bitcoin) before
  this goes live for real funds.
- **The 7 long-tail EVM chains' public RPC URLs: 5 of 7 confirmed live,
  2 were dead and have been replaced.** A plain `eth_chainId` POST against
  each returned the correct chain ID for Celo, Flare, Cronos, Kaia, and XDC
  Network. `rpc.ftm.tools` (Fantom) now returns HTTP 401 "API key not
  found" - gated despite being publicized as free - replaced with
  `https://rpcapi.fantom.network` (Fantom Foundation's own endpoint, live
  and correct chain ID 250/`0xfa`). `etc.rivet.link` (Ethereum Classic) no
  longer resolves in DNS at all - replaced with `https://etc.drpc.org`
  (live, correct chain ID 61/`0x3d`). See `block-watcher-deploy.yml` for
  the updated `env_vars`.
- **EVM token contract addresses: CONFIRMED live on-chain.** All 8
  addresses in `chain-config.ts`'s `tokenContracts` (ETH USDT/USDC, BEP20
  USDT, Arbitrum USDT/USDC, Optimism USDT/USDC, Base USDC) resolve to real
  deployed ERC20 contracts with the expected `symbol()`/`decimals()` -
  ETH/USDC pair confirmed via Alchemy's token-metadata API, the rest via a
  direct `eth_call` against each chain's public RPC. Two notes, neither a
  bug: (1) Arbitrum's USDT contract now returns `symbol() == "USD₮0"`
  instead of `"USDT"`, following Tether/LayerZero's 2025 USDT0 rebrand of
  Arbitrum's canonical bridged USDT - same contract address, cosmetic
  on-chain symbol change only; the code keys tokens by the config's own
  symbol label, not the on-chain `symbol()` call, so this doesn't affect
  detection. (2) BSC's USDT uses 18 decimals, not the 6 decimals Ethereum's
  USDT uses (confirmed live) - `evm-shared.ts`'s `getDecimals()` already
  fetches `decimals()` per-contract at runtime rather than assuming 6
  everywhere, so this is already handled correctly.

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
