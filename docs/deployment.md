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
