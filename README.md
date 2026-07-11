# AED Map

A monorepo for the AED (defibrillator) locator project.

```
apps/
  public/   # Public map PWA (Quasar/Vue) — no login required
  admin/    # Admin panel (Quasar/Vue) — invite-only, manages locations & devices [planned]
  api/      # Backend API (NestJS + PostgreSQL) [planned]
packages/
  shared/   # Pure logic shared between apps/public and apps/admin [planned]
infra/      # Self-hosted deployment (Docker Compose, Caddy) [planned]
```

Package manager: [pnpm](https://pnpm.io) workspaces.

## Install dependencies

```bash
pnpm install
```

## Public map — develop

```bash
pnpm --filter aed-map-public dev
```

## Public map — lint / format / build

```bash
pnpm --filter aed-map-public lint
pnpm --filter aed-map-public format
pnpm --filter aed-map-public build
```

Or run any script across every workspace package: `pnpm -r <script>` (e.g. `pnpm -r lint`).
