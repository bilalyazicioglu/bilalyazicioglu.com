#!/usr/bin/env bash
# Explicit disaster recovery. Validates before stopping anything; saves a safety copy.
set -euo pipefail
trap 'exit 130' INT
trap 'exit 143' TERM
archive=$(readlink -f "${1:?usage: scripts/restore-content.sh backup.tar.gz}")
cd "$(dirname "$(readlink -f "$0")")/.."
umask 077
mkdir -p .operations/backups
exec 9>.operations/deploy.lock
flock -n 9 || { echo 'Another deployment/backup is running' >&2; exit 1; }
staging=$(mktemp -d "$(pwd)/.operations/restore.XXXXXX")
trap 'rm -rf "$staging"' EXIT
python3 scripts/backup.py restore "$archive" "$staging"
image=$(docker inspect -f '{{.Image}}' blog)
docker stop -t 30 blog >/dev/null
trap 'docker start blog >/dev/null; rm -rf "$staging"' EXIT
python3 scripts/backup.py create
# Only application content/data are replaced. .env and infrastructure stay outside backups.
docker run --rm --user 0 --volumes-from blog -v "$staging:/restore:ro" --entrypoint sh "$image" -ec '
  find /app/content /app/data -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  cp -a /restore/content/. /app/content/
  cp -a /restore/data/. /app/data/
  mkdir -p /app/content/uploads/blog
  cp -an /restore/legacy-uploads/. /app/content/uploads/blog/
  chown -R 1001:1001 /app/content /app/data
'
docker start blog >/dev/null
trap 'rm -rf "$staging"' EXIT
echo 'Content restored. Check /api/status and published posts before reopening editing.'
