# Build context is the repo root — see release.sh
#
# The gateway nginx with infra/nginx.conf baked in, so the production stack
# (infra/docker-compose.prod.yml) needs no files from this repo on the server.
# The dev stack (infra/docker-compose.yml) still bind-mounts the same config.

FROM nginx:1.27-alpine
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
