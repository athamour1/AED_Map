#!/usr/bin/env bash
set -euo pipefail

# Builds the API image and pushes it to GHCR on demand. Replaces the
# GitHub Actions-based deploy-api.yml — this repo doesn't run CI/CD
# automatically; images are published manually, whenever you choose to.
#
# Requires: docker, gh (authenticated — run `gh auth login` first).
# Usage:    ./scripts/push-api-image.sh [extra-tag]

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

IMAGE="ghcr.io/athamour1/aed-map/api"
SHA_TAG="$(git rev-parse --short HEAD)"
EXTRA_TAG="${1:-}"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI not found — install it and run 'gh auth login' first." >&2
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "error: gh CLI is not authenticated — run 'gh auth login' first." >&2
  exit 1
fi

GH_USER="$(gh api user -q .login)"

echo "==> Logging in to ghcr.io as $GH_USER"
gh auth token | docker login ghcr.io -u "$GH_USER" --password-stdin

TAG_ARGS=(-t "$IMAGE:$SHA_TAG" -t "$IMAGE:latest")
if [[ -n "$EXTRA_TAG" ]]; then
  TAG_ARGS+=(-t "$IMAGE:$EXTRA_TAG")
fi

echo "==> Building ${TAG_ARGS[*]}"
docker build -f apps/api/Dockerfile "${TAG_ARGS[@]}" .

echo "==> Pushing tags"
docker push "$IMAGE:$SHA_TAG"
docker push "$IMAGE:latest"
if [[ -n "$EXTRA_TAG" ]]; then
  docker push "$IMAGE:$EXTRA_TAG"
fi

echo "==> Done:"
echo "    $IMAGE:$SHA_TAG"
echo "    $IMAGE:latest"
[[ -n "$EXTRA_TAG" ]] && echo "    $IMAGE:$EXTRA_TAG"
exit 0
