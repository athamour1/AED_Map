# Build context is the repo root (this is a pnpm workspace) — see infra/docker-compose.yml

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.11.0 --activate
WORKDIR /repo

# ---- deps: workspace install for the admin app + its shared dependency ----
# --ignore-scripts: apps/admin's postinstall (`quasar prepare`) needs the
# actual project source, which isn't copied in until the build stage below.
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# ---- build: compile the Quasar SPA ----
FROM deps AS build
COPY packages/shared packages/shared
COPY apps/admin apps/admin
RUN pnpm --filter aed-map-admin exec quasar prepare
RUN pnpm --filter aed-map-admin build

# ---- artifact: holds only the static output. Never runs as a server itself —
# the `admin-assets` compose service runs this image once to copy the files
# into a shared volume that the `nginx` service then serves directly.
FROM alpine:3.20 AS artifact
COPY --from=build /repo/apps/admin/dist/spa /dist
CMD ["sh", "-c", "rm -rf /output/* && cp -a /dist/. /output/ && echo 'apps/admin assets synced'"]
