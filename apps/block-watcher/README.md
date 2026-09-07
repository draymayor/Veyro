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
- **Bitcoin/Litecoin/Dogecoin** via polling Alchemy's Bitcoin JSON-RPC API
  (Bitcoin Core's own RPC methods, proxied by Alchemy) - `getblockcount`
  every 45s, and on a new height, `getblockhash` + `getblock` verbosity 2
  to get every transaction in the block fully decoded (output addresses
  included) in one call. Confirmed live 2026-09-07 against real mainnet
  data on all three chains.

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
- **Bitcoin mainnet vs. BlockCypher's free tier: resolved by switching
  providers, not by tuning BlockCypher.** BlockCypher's free tier
  (confirmed live 2026-09-07: 100 req/hr, shared across BTC/LTC/DOGE, no
  per-chain token) couldn't sustain real Bitcoin block volume (3,702-7,276
  tx/block sampled live) because getting decoded outputs needed one
  request per transaction on top of the block fetch itself. Alchemy's
  Bitcoin JSON-RPC API doesn't have that shape: `getblock` verbosity 2
  returns every transaction in a block already decoded - including output
  addresses - in a single request, confirmed live against a real 3,712-tx
  Bitcoin mainnet block and a real Litecoin block. Its documented endpoint
  (`bitcoin-mainnet.alchemy-blast.com`, per Alchemy's own quickstart page)
  is Cloudflare-blocked for every client tested (curl, Node, and a real
  browser navigation) - the working endpoint follows the standard
  `{chain}-mainnet.g.alchemy.com` pattern instead, see chain-config.ts's
  `alchemyNetwork` field. CU cost confirmed against Alchemy's own current
  pricing table (`getblockcount`/`getblockhash`/`getblock` are all a flat
  10 CU regardless of verbosity): ~4,200 CU/hr combined for all three
  chains at this polling rate, ~3.1M CU/month - about 10% of the 30M/month
  free tier, alongside apps/api's separate (much smaller, webhook-only)
  Alchemy usage. `UTXO_DETECTION_ENABLED` is still an explicit opt-in
  (see config.ts) - flipping it on for real funds remains a deliberate
  decision, but the provider-side blocker is resolved.
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
