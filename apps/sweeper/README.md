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

## CONSOLIDATION_MASTER_SEED - IAM Deny policy status (2026-09-01)

**This section documents a deliberately incomplete piece of the
consolidator's IAM design. Read this before touching that secret or its
IAM.**

`CONSOLIDATION_MASTER_SEED` (one shared phrase controlling all 5
consolidation wallets - see `scripts/gcp/bootstrap-consolidator-iam.sh`'s
header for the full design and the confirmed, verified derivation path
per chain) was meant to get the same defense-in-depth treatment as the
sweeper's 5 seeds above: an explicit GCP IAM Deny policy blocking
`veyro-api-runtime` from `secretmanager.versions.access` on it, on top of
the default-deny baseline.

**That explicit deny policy could not be created, after exhausting every
reasonable path** (project-level role grant, org-level role grant, the
Cloud Console UI, and Google's own Policy Troubleshooter/Remediator).
Findings, confirmed independently by Google's own diagnostic tooling:

- `roles/iam.denyAdmin` cannot be granted at the project level at all
  (`gcloud projects add-iam-policy-binding` rejects it: "Role
  roles/iam.denyAdmin is not supported for this resource").
- Granting it at the organization level (`155200553402`) succeeds and is
  visible in the org's IAM bindings, but `gcloud iam policies create`
  attached to the project still fails with the same permission-denied
  error - even attached to the organization itself, where the role
  actually lives, it still failed.
- Google's own Policy Troubleshooter/Remediator confirmed this is real:
  "Principal is eligible" + "no policy denies access" + "missing
  permissions" simultaneously, and remediation found "no individual,
  predefined roles include all missing permissions" for this account on
  this resource.
- This is a genuine, undocumented structural gap in how
  `iam.denypolicies.create` resolves for this account/resource
  combination - not a mistake in any command, role name, JSON shape, or
  grant along the way. Every other piece of this design (dedicated
  `veyro-consolidator` SA, `secretAccessor` grant, all 5 derivation
  paths) was independently verified correct before this was attempted.
- The temporary org-level `iam.denyAdmin` grant used to attempt this has
  already been revoked and verified gone. Nothing elevated was left
  standing from the attempt.

**The actual security boundary is fully intact without the deny policy.**
`veyro-api-runtime` has never been granted `secretAccessor` (or any role)
on `CONSOLIDATION_MASTER_SEED` - confirmed via
`gcloud secrets get-iam-policy CONSOLIDATION_MASTER_SEED`. GCP IAM is
deny-by-default: no grant means no access, with or without an explicit
deny policy layered on top. The deny policy was always meant as an
additional, auditable safety net against someone *later* adding an
unwanted grant by mistake - not the thing currently preventing access.

**If this gap is ever resolved** (org/Cloud Identity setup changes,
or GCP updates its role/permission mapping so some role actually
resolves `iam.denypolicies.create` for this account on this project),
the rest of the work is already done and doesn't need to be redone -
only the final `gcloud iam policies create` call remains:

- Tag already created and bound: `consolidation-deny-scope=consolidator-secret`
  on the `CONSOLIDATION_MASTER_SEED` secret.
- Deny policy JSON already written and verified correct (the
  `resource.matchTag(...)` condition, the fully-qualified
  `secretmanager.googleapis.com/versions.access` permission, the
  `principal://...serviceAccounts/veyro-api-runtime@...` principal) - see
  `scripts/gcp/bootstrap-consolidator-iam.sh`'s step 3c.
- Once permissions resolve correctly, re-run just that one
  `gcloud iam policies create` command (project or org attachment-point,
  whichever ends up working) - nothing else in this design needs to
  change.

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
