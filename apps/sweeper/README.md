# Sweeper

Consolidates funds sitting in per-user deposit addresses
(`user_crypto_addresses`) into one dedicated, non-HD consolidation wallet
per chain. Deliberately a separate deployable from `apps/api`:

- **Separate Cloud Run JOB**, not a service - runs once to completion per
  invocation and exits, rather than staying up to serve requests.
- **Separate service account**, with `secretmanager.secretAccessor` on the
  5 master seed secrets that `apps/api`'s runtime service account is
  explicitly denied.
- **Separate schedule**: two Cloud Scheduler jobs invoke the same image with
  a different `SWEEP_GROUP` - `utxo` (BTC/LTC/DOGE) every 12h, `evm`
  (every EVM chain + TRON) every 6h.
- **Separate deploy pipeline** (`.github/workflows/sweeper-deploy.yml`),
  triggered only by changes under `apps/sweeper/**`.

## One-time setup

Run `scripts/gcp/bootstrap-sweeper-iam.sh` once, by hand, from a shell with
`gcloud` authenticated as a project owner/IAM admin. It is NOT run by CI and
is NOT idempotent-safe to run blindly against production without reading it
first - review every command before executing. It:

1. Creates the sweeper's dedicated service account.
2. Creates the 5 master seed secrets (empty placeholders - filling them
   with real seed material is a separate, deliberate step, not part of this
   script).
3. Grants the sweeper's service account `secretAccessor` on all 5, and
   explicitly denies the main API's runtime service account on all 5.
4. Creates the Cloud Run Job resource (no traffic/ingress - jobs aren't
   invoked over HTTP).
5. Creates the two Cloud Scheduler jobs (12h utxo, 6h evm) that invoke it.

## Populating the master seeds

The 5 secrets this job's service account can read - all generated and
verified (`gcloud secrets versions list`) as of 2026-08-30:

| Secret | Covers |
|---|---|
| `SWEEPER_BTC_SEED` | BTC |
| `SWEEPER_LTC_SEED` | LTC |
| `SWEEPER_DOGE_SEED` | DOGE |
| `SWEEPER_EVM_SEED` | ETH, USDT, USDC, BNB, POL, AVAX, CELO, FLR, FTM, CRO, ETC, KAIA, XDC + Arbitrum/Optimism/Base |
| `SWEEPER_TRON_SEED` | TRX, USDT-TRC20 |

XRP, Stellar, and Bitcoin Cash were all dropped from scope, each for the
same reason: no local-mnemonic wallet-provider exists for them in Tatum's
current SDK, so generating their keys would mean a materially different
trust model (server-side at Tatum) than the other 5, which generate
entirely locally. Revisit properly in V2 if there's real demand -
`SWEEPER_BCH_SEED` was created as an empty placeholder by an earlier
version of this bootstrap script but was never populated (generation
failed cleanly, confirmed via `gcloud secrets versions list` showing 0
items) and is no longer a target of this script; delete the leftover
empty container by hand if you want it fully gone
(`gcloud secrets delete SWEEPER_BCH_SEED`).

None of these are populated by this codebase. Generating and writing the
actual seed material is a deliberate, separate, manual step - see the
project's planning notes for why (short version: it should never pass
through a running process, a log, or version control).

## Provisioning consolidation wallets

Each chain's `consolidation_wallets` row must be inserted (address,
chain, `is_active`) before that chain's sweeps can run - the runner throws
if a chain has no active consolidation wallet configured, rather than
silently sweeping nowhere.

## Verifying before production

This is financial infrastructure - do not point it at mainnet without:

- Running every chain adapter against its testnet first (`SWEEP_DRY_RUN=true`,
  then a real testnet sweep).
- Verifying the BIP44 derivation path each adapter uses actually reproduces
  the same address Tatum derived for `apps/api`'s deposit-address
  generation (see the "verify" comments in `src/chains/evm.ts`,
  `src/chains/tron.ts`).
- Verifying every hardcoded token contract address in
  `src/chains/registry.ts` and `src/chains/tron.ts` against the official
  contract/explorer for that chain.
- Confirming Bitcoin Cash's `SIGHASH_FORKID` transaction construction in
  `src/chains/utxo.ts` against a real BCH testnet broadcast - this is the
  highest-risk chain in this adapter set.
