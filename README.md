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

Planned but not started features live in [ROADMAP.md](ROADMAP.md).

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
released images from GHCR — nothing is built on the server and no clone of the
repo is needed. Only two files go to the server:

- `infra/docker-compose.prod.yml`
- `infra/.env.prod.example`, copied as `.env.prod` and filled in

```
Internet ──443──▶ your reverse proxy (TLS) ──▶ 127.0.0.1:8080 gateway
                                                 ├─ /        → public
                                                 ├─ /admin/  → admin
                                                 └─ /api/    → api ─▶ postgres
```

#### Environment (`.env.prod`)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `POSTGRES_PASSWORD` | yes | — | **Hex only** (`openssl rand -hex 24`): it is embedded in the database URL, where `/ + @ :` break it. Never change it after the first `up` — Postgres only reads it when the volume is created. |
| `JWT_ACCESS_SECRET` | yes | — | Signs access tokens (`openssl rand -base64 48`). Rotating it only expires current access tokens; clients refresh silently. |
| `APP_ORIGIN` | yes | — | Exact origin users open, e.g. `https://aed.example.gr` (no trailing slash). A mismatch makes login return 403. |
| `TAG` | no | `latest` | Image tag to run. Prefer a pinned release (`v1.0.1`) so you know what runs and can roll back. |
| `POSTGRES_USER` / `POSTGRES_DB` | no | `aedmap` | |
| `BIND_ADDR` | no | `127.0.0.1` | Host address the gateway listens on (see *Ports* below). |
| `HTTP_PORT` | no | `8080` | Host port of the gateway. |

Compose refuses to start if a required variable is missing. To generate a
file with random secrets on the server (edit the domain and tag):

```bash
cat > .env.prod <<EOF
TAG=v1.0.1
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_ACCESS_SECRET=$(openssl rand -base64 48 | tr -d '\n')
APP_ORIGIN=https://aed.example.gr
EOF
chmod 600 .env.prod
```

#### First deploy

```bash
alias dc='docker compose -f docker-compose.prod.yml --env-file .env.prod'

# GHCR packages are private by default — log in once (a token with read:packages)
docker login ghcr.io

dc pull
dc up -d                              # migrations run automatically before the api starts

# Once, on a fresh database: import the original AED locations (idempotent)
dc --profile seed run --rm seed

# Once: create the first admin account
dc exec \
  -e ADMIN_BOOTSTRAP_EMAIL='you@example.gr' \
  -e ADMIN_BOOTSTRAP_PASSWORD='a-strong-password' \
  -e ADMIN_BOOTSTRAP_DISPLAY_NAME='Your Name' \
  api node dist/cli/create-admin.js
```

The admin credentials are **not** stored in `.env.prod` — they are passed only
to that one command, so no password stays on the server (prefix the command
with a space to keep it out of shell history on most shells). If the email
already exists the command does nothing. Everyone else is invited from the
admin panel's **Users** page. Then sign in at `https://<your-domain>/admin/`.

#### Ports

Only the gateway publishes a port (`BIND_ADDR:HTTP_PORT`, default
`127.0.0.1:8080`); postgres, api, public and admin are reachable only on the
internal Docker network. On the host firewall open just 80/443 for your
reverse proxy (plus SSH) — never 8080.

- **Proxy on the same host, not in Docker** — keep the defaults.
- **Proxy in a Docker container on the same host** — it can't reach the host's
  `127.0.0.1`; set `BIND_ADDR=172.17.0.1` (Docker bridge), or attach the proxy
  to the `aed-map-prod_default` network and proxy to `gateway:80`.
- **Proxy on another machine** — `BIND_ADDR=0.0.0.0`, allow 8080 only from the
  proxy's IP, and if that IP is public add it to `set_real_ip_from` in
  [infra/nginx.conf](infra/nginx.conf) (otherwise rate limiting sees every
  visitor as the proxy).

The proxy must send `X-Forwarded-For` and `X-Forwarded-Proto` (Caddy does by
default) and should set HSTS. Minimal Caddyfile:

```
aed.example.gr {
    reverse_proxy 127.0.0.1:8080
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
}
```

#### Upgrades and rollback

```bash
sed -i 's/^TAG=.*/TAG=v1.0.2/' .env.prod
dc pull && dc up -d                   # new migrations apply before the api restarts
```

Roll back by setting the previous `TAG` and running the same two commands
(migrations are forward-only — a rollback across a schema change needs a
database restore). Back up the `postgres-data` volume, e.g.
`dc exec -T postgres pg_dump -U aedmap aedmap > backup.sql`.

### Local stack

[infra/docker-compose.yml](infra/docker-compose.yml) builds everything from
source (`docker compose up -d --build`) with the same layout: a gateway nginx
([infra/nginx.conf](infra/nginx.conf)) on `:8080` path-routes `/`, `/admin/`,
`/api/` to the `public`/`admin`/`api` containers.
