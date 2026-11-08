#!/usr/bin/env bash
# Candidate smoke test -> consistent backup -> activation -> automatic image rollback.
set -euo pipefail
trap 'exit 130' INT
trap 'exit 143' TERM
main() {
  cd "${BLOG_CHECKOUT:-$(dirname "$(readlink -f "$0")")/..}"
  umask 077
  mkdir -p .operations/backups
  exec 9>.operations/deploy.lock
  flock -n 9 || { echo 'Another deployment/backup is running' >&2; exit 1; }
  [ -z "$(git status --porcelain --untracked-files=no)" ] || { echo 'Tracked checkout is dirty' >&2; exit 1; }
  git fetch --quiet origin
  local target="${1:-origin/main}"
  # Serialize old queued CI jobs without deploying an untested newer commit.
  local wanted
  wanted=$(git rev-parse "$target^{commit}")
  if git merge-base --is-ancestor "$wanted" HEAD && [ "$wanted" != "$(git rev-parse HEAD)" ]; then
    echo 'Skipping obsolete deployment'; return
  fi
  git merge --ff-only --quiet "$wanted"
  export GIT_SHA=$(git rev-parse HEAD)
  export GIT_SUBJECT=$(git log -1 --format=%s)
  export GIT_COMMIT_TIME=$(git log -1 --format=%ct)
  local previous previous_date candidate network candidate_id backup activated=false
  previous=$(docker inspect -f '{{.Image}}' blog)
  previous_date=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' blog | sed -n 's/^DEPLOYED_AT=//p')
  candidate="portfolio-blog:$GIT_SHA"
  export BLOG_IMAGE="$candidate"
  # Retain activation metadata for later manual compose restarts too.
  docker compose build --pull blog
  network=$(docker inspect -f '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' blog | head -1)
  candidate_id=$(docker run -d --network "$network" --volumes-from blog:ro --entrypoint node "$candidate" server.js)
  cleanup() { docker rm -f "$candidate_id" >/dev/null 2>&1 || true; }
  trap cleanup EXIT
  healthy() {
    local container=$1 expected=$2
    docker exec "$container" node -e '
      (async()=>{
        const r=await fetch("http://127.0.0.1:3000/api/status",{signal:AbortSignal.timeout(5000)}); const s=await r.json();
        if(!r.ok || s.backend!=="homeserver" || s.release.sha!==process.argv[1]) process.exit(1);
        for(const p of ["/","/resume.pdf","/blog"]) {
          const r=await fetch("http://127.0.0.1:3000"+p,{signal:AbortSignal.timeout(5000)});
          if(!r.ok) process.exit(1); await r.body.cancel();
        }
      })().catch(()=>process.exit(1))' "$expected" 2>/dev/null
  }
  ready() { for _ in $(seq 1 30); do healthy "$1" "$2" && return 0; sleep 2; done; return 1; }
  ready "$candidate_id" "$GIT_SHA" || { echo 'Candidate failed; running release untouched' >&2; exit 1; }
  cleanup
  # Preserve uploads made before persistent media support was introduced.
  docker exec blog sh -ec 'mkdir -p /app/content/uploads/blog; if [ -d /app/public/uploads/blog ]; then cp -an /app/public/uploads/blog/. /app/content/uploads/blog/; fi'
  docker stop -t 30 blog >/dev/null
  rollback_on_error() {
    local code=$?
    cleanup
    if $activated; then
      echo 'Activation failed; restoring previous image' >&2
      export BLOG_IMAGE="$previous" DEPLOYED_AT="$previous_date"
      if ! docker compose up -d --no-deps --no-build blog; then
        echo 'CRITICAL: rollback failed; static fallback remains available' >&2
      fi
    else
      docker start blog >/dev/null || true
    fi
    exit "$code"
  }
  trap rollback_on_error EXIT
  backup=$(python3 scripts/backup.py create)
  export DEPLOYED_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  activated=true
  docker compose up -d --no-deps --no-build blog
  ready blog "$GIT_SHA" || { echo 'Activated release failed health check' >&2; exit 1; }
  # Durable references: manual rollback never needs to guess a mutable tag.
  printf '%s\n' "$previous" > .operations/previous-image
  printf '%s\n' "$previous_date" > .operations/previous-activated-at
  printf '%s\n' "$candidate" > .operations/current-image
  printf '%s\n' "$DEPLOYED_AT" > .operations/current-activated-at
  printf '%s\n' "$backup" > .operations/latest-backup
  trap - EXIT
  if command -v crontab >/dev/null; then
    bash scripts/install-backup-cron.sh || echo 'WARNING: daily backup scheduling failed; run scripts/install-backup-cron.sh' >&2
  else
    echo 'WARNING: crontab is unavailable; daily backup must be scheduled manually' >&2
  fi
  echo "Deployed ${GIT_SHA:0:7}; verified backup: $backup"
}
main "$@"
