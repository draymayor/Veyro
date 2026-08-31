# Veyro — Deployment

## Overview

Frontend and backend deploy independently, matching the split in `architecture.md`.

```
Frontend (Next.js)  →  Vercel        (git push → auto preview/production)
Backend (NestJS)    →  GCP Cloud Run (containerized deploy)
Database/Auth/Storage → Supabase      (managed, migrations only — no deploy step)
```

## Frontend — Vercel

- Connect the repo's frontend directory to a Vercel project (separate from Monance's Vercel project).
- Environment variables (Vercel dashboard):
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  NEXT_PUBLIC_API_BASE_URL=          -- points to the Cloud Run backend
  ```
- Preview deployments on every PR (standard Vercel git integration) — matches the mobile-PR workflow already used on other projects.
- Production deploys on merge to main.

## Backend — GCP Cloud Run

- Containerize the NestJS app (Dockerfile at repo root of backend package).
- Deploy via `gcloud run deploy` or a CI pipeline (GitHub Actions → Cloud Run), consistent with how Monance's backend is deployed on GCP — reuse existing GCP project/billing setup, but as a **separate Cloud Run service**, not shared with Monance's service.
- Environment variables (Cloud Run service config / Secret Manager):
  ```
  SUPABASE_URL=
  SUPABASE_SERVICE_ROLE_KEY=
  RESEND_API_KEY=
  MONANCE_PRICE_FEED_URL=            -- internal reference to reuse existing price feed
  ```
- Scaling: allow scale-to-zero for cost control pre-launch; set min instances = 1 only once consistent traffic justifies avoiding cold starts.

## Supabase

- No deployment step — apply schema changes via `supabase db push` (or CI-integrated migration step) using the migration files described in `supabase-setup.md`.
- Separate Supabase project from Monance — confirm project ref/keys are correctly scoped per environment (see below).
- **Migration drift check, required, not optional.** This project hit "migration file exists locally, was never applied to the live database" as a real, repeated bug (caught reactively 6 separate times during development, each time because a specific feature silently failed). This must not remain something a person discovers by a feature breaking.
  - Implemented as [`.github/workflows/migration-drift-check.yml`](../.github/workflows/migration-drift-check.yml), a required check on every PR touching `supabase/migrations/` (so a migration must already be applied live before its PR can merge, not "merge now, push later"), plus a 6-hourly schedule to catch drift introduced outside a PR.
  - The check itself is [`scripts/check-migration-drift.mjs`](../scripts/check-migration-drift.mjs), which runs `supabase migration list --db-url "$SUPABASE_DB_URL"` and fails if any migration is local-only or remote-only. `supabase db push --dry-run` was considered but only surfaces pending local migrations (one direction) and doesn't validate SQL (see [supabase/cli#776](https://github.com/supabase/cli/issues/776)); `migration list` covers both directions.
  - Manual command, run any time: `pnpm db:check-drift` (requires `SUPABASE_DB_URL` set to the live project's direct connection string and the `supabase` CLI on PATH).
  - A `.husky/pre-push` hook runs the same check locally (skipped with a note if `SUPABASE_DB_URL` isn't set) as an early, non-blocking warning ahead of CI.
  - Requires a `SUPABASE_DB_URL` GitHub Actions secret (direct connection string, port 5432, not the pooler).

## Environments

Recommend three environments, consistent with a typical setup for this scale:

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Local dev | `next dev` | `nest start --watch` | Local Supabase (via CLI) or a dev Supabase project |
| Staging | Vercel preview | Cloud Run staging revision | Supabase staging project |
| Production | Vercel production | Cloud Run production revision | Supabase production project |

## Secrets Management

- Frontend: only `NEXT_PUBLIC_*` (anon key, base URL) — never the Supabase service role key.
- Backend: service role key, Resend API key, and any future Prestmit/KYC provider keys stored in GCP Secret Manager, injected into Cloud Run at deploy time — not committed to the repo.

## Sweeper — GCP Cloud Run Job

Deliberately NOT part of the Cloud Run *service* above - see
`apps/sweeper/README.md` for the full design. Summary:

- A separate Cloud Run **Job** (runs to completion and exits on each
  invocation, not a long-running request handler), built from
  `apps/sweeper/Dockerfile` and deployed by
  `.github/workflows/sweeper-deploy.yml`.
- Its own dedicated GCP service account, the only identity in the project
  granted `secretmanager.secretAccessor` on the 5 master seed secrets
  (`SWEEPER_BTC_SEED`, `SWEEPER_LTC_SEED`, `SWEEPER_DOGE_SEED`,
  `SWEEPER_EVM_SEED`, `SWEEPER_TRON_SEED`). The API's runtime service
  account is explicitly denied on all 5 - it only ever holds public xpubs
  (`TATUM_*_XPUB`), never seeds.
- Two Cloud Scheduler jobs invoke it on a staggered schedule: every 12h for
  UTXO chains (BTC/LTC/DOGE), every 6h for everything else (every EVM
  chain, plus TRON).
- One-time IAM/infra bootstrap: `apps/sweeper/scripts/gcp/bootstrap-sweeper-iam.sh`,
  run by hand, not by CI.
- Sweeps into a dedicated, non-HD `consolidation_wallets` row per chain -
  never into any address in the user-facing HD derivation tree.
- Every sweep attempt is recorded in `sweep_log` (append-only audit trail),
  service-role-only, not readable by the main API's runtime service account
  beyond what an admin dashboard might later expose read-only.
- Fee-aware minimum thresholds live in `platform_settings`
  (`sweep_min_threshold_*` keys) so they're admin-tunable without a
  redeploy.

## Release Checklist (V1 launch)

- [ ] Production domain veyro.best connected to Vercel, DNS configured, SSL verified
- [ ] Supabase production project created, migrations applied, RLS policies verified
- [ ] Storage buckets created and set to private
- [ ] Cloud Run backend deployed with production env vars/secrets
- [ ] Vercel frontend deployed with production env vars
- [ ] Crypto deposit addresses (static, published) verified correct before going live — an error here sends user funds to the wrong place
- [ ] Manual payout process confirmed with admin (no gateway automation in V1, per `admin-guide.md`)
- [ ] Email templates (`email-templates.md`) wired to Resend and test-sent
- [ ] Legal pages (Terms, Privacy, Gift Card Policy) live before accepting real trades
