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
RUN pnpm --filter aed-map-api exec prisma generate
RUN pnpm --filter aed-map-api run build
# The seed script is plain JS in the runtime image (no tsx there). Compiled to a
# separate dir, then copied next to prisma/seed-data so its __dirname-relative
# data path still resolves. Run in prod: `node prisma/seed.js`.
RUN pnpm --filter aed-map-api exec tsc prisma/seed.ts --outDir prisma-build \
      --module nodenext --moduleResolution nodenext --target es2023 \
      --esModuleInterop --skipLibCheck

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
COPY --from=build /repo/apps/api/prisma-build/seed.js apps/api/prisma/seed.js

WORKDIR /repo/apps/api
EXPOSE 3000
CMD ["node", "dist/main"]
