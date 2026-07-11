# Build context is the repo root (this is a pnpm workspace) — see infra/docker-compose.yml

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /repo

# ---- deps: full workspace install, needed for the Nest/TS build toolchain ----
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

# ---- build: compile the Nest app ----
FROM deps AS build
COPY apps/api apps/api
# The seed script (run from this stage via the `seed` compose service) reads
# the original data file out of apps/public — only that one file is needed here.
COPY apps/public/src/assets/aed-locations.json apps/public/src/assets/aed-locations.json
RUN pnpm --filter aed-map-api exec prisma generate
RUN pnpm --filter aed-map-api run build

# ---- runtime: production-only deps, client regenerated against this platform ----
FROM base AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --filter aed-map-api --prod --frozen-lockfile
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/prisma.config.ts
RUN pnpm --filter aed-map-api exec prisma generate
COPY --from=build /repo/apps/api/dist apps/api/dist

WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["node", "dist/main"]
