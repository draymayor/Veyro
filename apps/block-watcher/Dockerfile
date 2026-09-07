# syntax=docker/dockerfile:1
#
# Built from the monorepo root (see .github/workflows/block-watcher-deploy.yml:
# `docker build -f apps/block-watcher/Dockerfile .`), same reasoning as
# apps/api/Dockerfile and apps/sweeper/Dockerfile: pnpm workspaces need the
# full tree present to resolve correctly. Deliberately its own image, never
# bundled with or derived from any other app's image - unlike sweeper/
# consolidator, this runs as a Cloud Run SERVICE (always-on, holds
# persistent WebSocket connections), not a Job that runs once and exits, so
# it deploys with `gcloud run deploy` / deploy-cloudrun, min-instances=1, the
# same shape as apps/api rather than sweeper's `gcloud run jobs update`.

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --filter block-watcher... --frozen-lockfile
RUN pnpm --filter block-watcher build
RUN pnpm --filter block-watcher deploy --prod /prod/block-watcher

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/block-watcher ./
COPY --from=build /app/apps/block-watcher/dist ./dist

EXPOSE 8080
CMD ["node", "dist/main.js"]
