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
scripts/    # On-demand ops scripts (no CI/CD automation in this repo — see below)
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

There is no GitHub Actions CI/CD in this repo — everything is run on demand, locally:

- **API image**: `./scripts/push-api-image.sh` builds `apps/api/Dockerfile` and pushes it to GHCR, using your local `docker`/`gh` CLI auth. Run it whenever you want to publish a new image, not automatically on push.
- **Self-hosted stack**: see [infra/docker-compose.yml](infra/docker-compose.yml) and [infra/nginx.conf](infra/nginx.conf) — nginx serves plain HTTP on `:8080`, path-routing `/`, `/admin/`, `/api/` to the three apps. Put your own reverse proxy in front of it for TLS/the real domain.
- **Frontends** (`apps/public`, `apps/admin`): currently built and deployed manually — no script yet.
