# syntax=docker/dockerfile:1
#
# Built from the monorepo root (see .github/workflows/consolidator-deploy.yml:
# `docker build -f apps/consolidator/Dockerfile .`), same reasoning as
# apps/api/Dockerfile and apps/sweeper/Dockerfile: pnpm workspaces need the
# full tree present to resolve correctly. Deliberately its own image, never
# bundled with or derived from the API's or the sweeper's images - this runs
# as a Cloud Run JOB (runs once to completion and exits), not a long-running
# service, under its own dedicated service account (veyro-consolidator, see
# apps/sweeper/scripts/gcp/bootstrap-consolidator-iam.sh) - the only
# identity anywhere in the project with secretAccessor on
# CONSOLIDATION_MASTER_SEED.

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter consolidator... --frozen-lockfile
RUN pnpm --filter consolidator build
RUN pnpm --filter consolidator deploy --prod /prod/consolidator

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/consolidator ./
COPY --from=build /app/apps/consolidator/dist ./dist

CMD ["node", "dist/main.js"]
