# syntax=docker/dockerfile:1
#
# Built from the monorepo root (see .github/workflows/sweeper-deploy.yml:
# `docker build -f apps/sweeper/Dockerfile .`), same reasoning as
# apps/api/Dockerfile: pnpm workspaces need the full tree present to
# resolve correctly. Deliberately its own image, never bundled with or
# derived from the API's image - this runs as a Cloud Run JOB (runs once to
# completion and exits), not a long-running service, under its own
# dedicated service account (see scripts/gcp/bootstrap-sweeper-iam.sh).

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter sweeper... --frozen-lockfile
RUN pnpm --filter sweeper build
RUN pnpm --filter sweeper deploy --prod /prod/sweeper

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/sweeper ./
COPY --from=build /app/apps/sweeper/dist ./dist

CMD ["node", "dist/main.js"]
