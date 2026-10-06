#!/usr/bin/env bash
# Deploy on the server: update the checkout, rebuild the blog with the commit
# baked in for /infra, apply monitoring config changes, and check that the new
# build is the one actually serving.
#
#   scripts/deploy.sh          # by hand: deploy the latest main
#   scripts/deploy.sh <sha>    # from CI: deploy exactly the commit CI tested
#
# Run from anywhere inside the checkout on the server.
set -euo pipefail

# Everything is inside main, which bash parses in full before running it: the
# merge below rewrites this very file, and bash would otherwise go on reading
# the new version from the middle.
main() {
  cd "$(git rev-parse --show-toplevel)"

  if [ $# -gt 0 ]; then
    # Fast-forward to the tested commit, not to whatever main is by now: a
    # commit pushed since may not have passed CI yet.
    git fetch --quiet origin
    git merge --ff-only --quiet "$1"
  else
    git pull --ff-only
  fi

  export GIT_SHA="$(git rev-parse HEAD)"
  export GIT_SUBJECT="$(git log -1 --format=%s)"
  export GIT_COMMIT_TIME="$(git log -1 --format=%ct)"

  # --build is not optional: without it compose reuses the old image and the
  # "deploy" silently ships stale code.
  docker compose up -d --build blog

  # Recreate exporters whose command changed, then have Prometheus re-read its
  # config file (a bind mount, so compose doesn't notice edits to it).
  docker compose up -d node-exporter prometheus
  docker compose kill -s SIGHUP prometheus >/dev/null

  echo "waiting for ${GIT_SHA:0:7} to serve..."
  for _ in $(seq 1 30); do
    if docker compose exec -T blog wget -qO- http://127.0.0.1:3000/api/infra 2>/dev/null | grep -q "\"sha\":\"$GIT_SHA\""; then
      echo "deployed ${GIT_SHA:0:7}: $GIT_SUBJECT"
      exit 0
    fi
    sleep 2
  done

  echo "deploy check failed: /api/infra is not reporting ${GIT_SHA:0:7}" >&2
  docker compose logs --tail 30 blog >&2
  exit 1
}

main "$@"
