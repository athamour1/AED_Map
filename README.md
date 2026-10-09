# AED Map

A monorepo for the AED (defibrillator) locator project.

```
apps/
  public/   # Public map PWA (Quasar/Vue) — no login required
  admin/    # Admin panel (Quasar/Vue) — invite-only, manages locations & devices
  api/      # Backend API (NestJS + PostgreSQL)
packages/
  shared/   # Pure logic shared between apps/public and apps/admin
infra/      # Self-hosted deployment (Docker Compose + nginx)
release.sh  # Builds + pushes images, tags a GitHub release (see below)
```

Package manager: [pnpm](https://pnpm.io) workspaces.

## Install dependencies

```bash
pnpm install
```

## Develop

```bash
pnpm --filter aed-map-public dev   # public map
pnpm --filter aed-map-admin dev    # admin panel
pnpm --filter aed-map-api start:dev  # API
```

## Lint / build / test

Per package: `pnpm --filter <name> <script>` (e.g. `pnpm --filter aed-map-api test`).
Across every workspace package: `pnpm -r <script>` (e.g. `pnpm -r lint`, `pnpm -r build`).

## Deploying

There is no GitHub Actions CI/CD in this repo — everything is run on demand, locally.

### Release

```bash
./release.sh
```

Asks for a version, bumps every `package.json`, commits, builds and pushes the
`api`, `public`, `admin` and `gateway` images to `ghcr.io/athamour1/aed-map/*`
(tagged `vX.Y.Z` and `latest`), then pushes a git tag and creates a GitHub
release. Needs `docker` and an authenticated `gh` CLI, and a clean working tree.

### Production

[infra/docker-compose.prod.yml](infra/docker-compose.prod.yml) runs the
released images — no build, no repo clone on the server. Copy it and
[infra/.env.prod.example](infra/.env.prod.example) (as `.env.prod`) to the
server; the file header has the first-run steps (seed + first admin). The
gateway listens on plain HTTP (`127.0.0.1:8080` by default) — put your own
reverse proxy in front for TLS and the real domain.

### Local stack

[infra/docker-compose.yml](infra/docker-compose.yml) builds everything from
source (`docker compose up -d --build`) with the same layout: a gateway nginx
([infra/nginx.conf](infra/nginx.conf)) on `:8080` path-routes `/`, `/admin/`,
`/api/` to the `public`/`admin`/`api` containers.
