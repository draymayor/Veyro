# Consolidator

Signs and broadcasts real outbound crypto withdrawals: for each `withdrawals`
row at `method='crypto', status='processing', crypto_signing_status='ready_to_sign'`,
sends the user's exact owed `amount` from that chain's one fixed
`consolidation_wallets` address to `crypto_payout_address`. This is the
piece that actually spends money, not just moves it internally - see the
design discussion this was built from before touching this code.

Deliberately a separate deployable from both `apps/api` and `apps/sweeper`:

- **Separate Cloud Run JOB**, not a service - runs once to completion per
  invocation and exits.
- **Separate service account** (`veyro-consolidator`), the only identity in
  the project granted `secretmanager.secretAccessor` on
  `CONSOLIDATION_MASTER_SEED` - a single shared mnemonic covering all 5
  consolidation wallets at once (see
  `apps/sweeper/scripts/gcp/bootstrap-consolidator-iam.sh`'s header for the
  full IAM design and confirmed derivation paths). Neither `apps/api`'s nor
  `apps/sweeper`'s service accounts have any access to it.
- **No schedule.** Unlike the sweeper's two Cloud Scheduler jobs, this job
  is invoked ONLY by hand: `gcloud run jobs execute veyro-consolidator`.
  Signing a real outbound transaction is meant to always be a deliberate,
  human-triggered action. If that assumption ever needs to change, that's a
  decision to make explicitly, not something to wire up quietly.
- **Separate deploy pipeline** (`.github/workflows/consolidator-deploy.yml`),
  triggered only by changes under `apps/consolidator/**`.

## Why this reuses apps/sweeper's chain libraries, not its adapters

The signing/broadcast primitives (`bitcoinjs-lib` PSBT signing, `ethers`
`HDNodeWallet`/`Contract.transfer`, `tronweb`
`transactionBuilder`/`trx.sign`/`sendRawTransaction`) are the same ones
`apps/sweeper`'s chain adapters already use and have proven work. But the
actual adapter classes here are new, not imported, because the behavior is
materially different in three ways:

1. **Fixed single address, not a derived range.** The sweeper derives one
   address per user per index; the consolidator always signs from ONE
   fixed, confirmed derivation path per chain (see
   `src/chains/utxo.ts`/`evm.ts`/`tron.ts` - the paths are hardcoded
   verbatim from `scripts/gcp/bootstrap-consolidator-iam.sh` and must never
   be re-derived, guessed, or adjusted).
2. **Fee is paid on top, not deducted.** The sweeper sends "everything
   available, minus fee" (`sendValue = balance - fee`). The consolidator
   must send the user's exact `amount` in full - the fee comes out of the
   consolidation wallet's own balance separately. Get this backwards and a
   user is underpaid.
3. **A pre-signing on-chain solvency check.** Every `payout()` call checks
   the consolidation wallet's real on-chain balance covers `amount + fee`
   (or, for a token, that the token balance covers `amount` AND the native
   balance covers `fee`) BEFORE deriving any key material or attempting to
   sign anything. This exists because deposit crediting into `crypto_wallets`
   is entirely manual admin action today (no webhook, no automated
   verification) - the internal ledger balance a withdrawal is drawn from is
   not proof the consolidation wallet actually holds the matching funds
   on-chain.

## The 'signing' lock and what a stuck row means

`crypto_signing_status='signing'` is not just a status label - it's an
atomic claim (`UPDATE ... WHERE crypto_signing_status = 'ready_to_sign'`)
that makes it impossible for two runs to sign the same withdrawal twice.

If a withdrawal is ever found already sitting at `'signing'` when this job
starts, or if `ConsolidatorRunner.processOne` logs a withdrawal as "left at
`'signing'` for manual review" - **do not re-run the job against it and do
not manually reset its status.** It means an unexpected error happened at a
point where it's genuinely ambiguous whether the broadcast reached the
network before the error. Check the chain directly (the consolidation
wallet address for that chain, around the time in question, for a
transaction to the withdrawal's payout address) before deciding how to
resolve it by hand.

## Fee estimation limitations (documented, not silently assumed correct)

- UTXO chains: dust-change folding uses a generic `3x future spend cost`
  heuristic, not each chain's actual relay-dust policy. Verify on testnet.
- TRC20 transfers: the native-TRX float check only confirms a fixed buffer
  is present, it does not estimate the actual energy cost of a specific
  transfer. An insufficient float fails at broadcast, not at the pre-flight
  check - see `src/chains/tron.ts`'s `payoutToken` comment.

## Verifying before production

Same discipline as `apps/sweeper/README.md`'s "Verifying before
production" section, applied to this job specifically:

- Run with `CONSOLIDATOR_DRY_RUN=true` first, every time, after any code
  change.
- Confirm each chain adapter's derived `fromAddress` matches
  `consolidation_wallets` before ever removing the runtime check in
  `ConsolidatorRunner.processOne` that already asserts this on every run.
- Test a real signed testnet withdrawal end-to-end per chain before
  pointing this at a real mainnet consolidation wallet.
