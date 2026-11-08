#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
exec 9>.operations/deploy.lock
flock -n 9 || { echo 'Another deployment/backup is running' >&2; exit 1; }
export BLOG_IMAGE=$(cat .operations/previous-image)
export DEPLOYED_AT=$(cat .operations/previous-activated-at)
docker image inspect "$BLOG_IMAGE" >/dev/null
current=$(docker inspect -f '{{.Image}}' blog)
current_date=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' blog | sed -n 's/^DEPLOYED_AT=//p')
docker compose up -d --no-deps --no-build blog
for _ in $(seq 1 30); do
  if docker exec blog node -e '(async()=>{for(const p of ["/","/resume.pdf","/api/infra"]){const r=await fetch("http://127.0.0.1:3000"+p,{signal:AbortSignal.timeout(5000)});if(!r.ok)process.exit(1);await r.body.cancel()}})().catch(()=>process.exit(1))' >/dev/null 2>&1; then
    printf '%s\n' "$current" > .operations/previous-image
    printf '%s\n' "$current_date" > .operations/previous-activated-at
    printf '%s\n' "$BLOG_IMAGE" > .operations/current-image
    printf '%s\n' "$DEPLOYED_AT" > .operations/current-activated-at
    echo 'Previous release restored; content volumes retained'; exit 0
  fi
  sleep 2
done
export BLOG_IMAGE="$current" DEPLOYED_AT="$current_date"
docker compose up -d --no-deps --no-build blog
echo 'Rollback target failed health check; restored the prior running image' >&2
exit 1
