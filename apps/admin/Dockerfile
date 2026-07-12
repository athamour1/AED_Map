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

# ---- runtime: this app serves itself — the infra/nginx.conf gateway
# reverse-proxies to this container rather than reading its files directly.
FROM nginx:1.27-alpine AS runtime
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/admin/dist/spa /usr/share/nginx/html/admin
