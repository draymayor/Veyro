# syntax=docker/dockerfile:1
#
# Built from the monorepo root (see api-deploy.yml: `docker build -f
# apps/api/Dockerfile .`), not from apps/api, because pnpm workspaces need
# the full workspace tree (lockfile, pnpm-workspace.yaml, all member
# package.json files) present to resolve correctly.

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter api... --frozen-lockfile
RUN pnpm --filter api build
# Prunes to a self-contained, prod-only install for just this package,
# with real files (not workspace symlinks) so it's portable into the
# runtime stage below.
RUN pnpm --filter api deploy --prod /prod/api

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/api ./
COPY --from=build /app/apps/api/dist ./dist

# Cloud Run injects PORT; Nest reads it in main.ts
EXPOSE 8080
CMD ["node", "dist/main.js"]
