# Veyro

Veyro is a web platform where users sell their gift cards and crypto directly to the platform (not a peer-to-peer marketplace). The user submits a card or crypto, sees a quoted rate up front, and — once verified — is paid instantly to their in-app wallet.

For full product, architecture, and design context, see the [`docs/`](./docs) folder:

- [`context.md`](./docs/context.md) — what Veyro is, business model, branding, V1 scope
- [`architecture.md`](./docs/architecture.md) — stack, system diagram, backend module structure
- [`database-schema.md`](./docs/database-schema.md) — Supabase/Postgres schema
- [`product-rules.md`](./docs/product-rules.md) — trade lifecycle and business rules
- [`api-spec.md`](./docs/api-spec.md) — API endpoints
- [`design-principles.md`](./docs/design-principles.md) — brand, color, typography
- [`supabase-setup.md`](./docs/supabase-setup.md), [`deployment.md`](./docs/deployment.md), [`admin-guide.md`](./docs/admin-guide.md), [`ui-copy.md`](./docs/ui-copy.md), [`email-templates.md`](./docs/email-templates.md), [`roadmap.md`](./docs/roadmap.md), [`planning-history.md`](./docs/planning-history.md)

## Structure

```
apps/
├── web/                # Next.js frontend (TypeScript, Tailwind, shadcn/ui) — Vercel
└── api/                # NestJS backend (TypeScript) — GCP Cloud Run
supabase/
└── migrations/         # Database migrations (source of truth for schema)
.github/workflows/      # CI (web) and build+deploy (api) pipelines
docs/                   # Full project documentation
```

## Tooling

This is a pnpm workspace monorepo orchestrated with [Turborepo](https://turborepo.com) (`turbo.json`). Pre-commit linting/formatting runs via Husky + lint-staged (`.husky/pre-commit`) — install hooks by running `pnpm install` inside a git repo (the `prepare` script wires them up automatically).

```bash
pnpm install
pnpm dev:web        # Next.js dev server
pnpm dev:api        # NestJS dev server
pnpm build          # turbo run build — builds both apps
pnpm lint           # turbo run lint — lints both apps
pnpm format:check   # turbo run format:check
```

Copy `.env.local.example` to `.env.local` in `apps/web`, and `.env.example` to `.env` in `apps/api`, filling in the required values.

## Database

Schema lives entirely in [`supabase/migrations/`](./supabase/migrations), applied in order:

1. `0001_initial_schema.sql` — tables + indexes
2. `0002_rls_policies.sql` — Row-Level Security policies
3. `0003_storage_buckets.sql` — private storage buckets (`card-images`, `receipts`, `deposit-proofs`) + per-user access policies

Apply with the Supabase CLI: `supabase db push` (see [`supabase-setup.md`](./docs/supabase-setup.md)).

## Deployment

- **Web** — Vercel's Git integration handles preview/production deploys directly (see [`deployment.md`](./docs/deployment.md)); `.github/workflows/web-deploy.yml` is a CI quality gate (lint/format/build) only, not a deploy step.
- **API** — `.github/workflows/api-deploy.yml` builds a Docker image and deploys it to GCP Cloud Run on push to `main`. Requires `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, and `GCP_ARTIFACT_REPO` repo secrets to be configured first.
