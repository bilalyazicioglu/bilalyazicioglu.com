#!/usr/bin/env bash
# Disposable Docker fixture: backup a stopped writer, restore into a new container.
set -euo pipefail
cd "$(dirname "$0")/.."
image=${1:-node:22-alpine}
fixture="portfolio-recovery-drill-$$"
recovered="${fixture}-restored"
staging=$(mktemp -d)
cleanup() {
  docker rm -fv "$fixture" "$recovered" >/dev/null 2>&1 || true
  rm -rf "$staging"
}
trap cleanup EXIT
mkdir -p "$staging/seed/content/blog" "$staging/seed/content/uploads/blog" "$staging/seed/data"
printf 'private draft\n' > "$staging/seed/content/blog/draft.mdx"
printf 'image fixture\n' > "$staging/seed/content/uploads/blog/image.png"
printf '{"views":7}\n' > "$staging/seed/data/views.json"
docker create --name "$fixture" --user 0 -v /app/content -v /app/data --entrypoint sh "$image" -c 'sleep 300' >/dev/null
docker cp "$staging/seed/content/." "$fixture:/app/content"
docker cp "$staging/seed/data/." "$fixture:/app/data"
docker start "$fixture" >/dev/null
docker stop -t 1 "$fixture" >/dev/null
archive=$(python3 scripts/backup.py create --container "$fixture" --directory "$staging/backups")
python3 scripts/backup.py verify "$archive"
python3 scripts/backup.py restore "$archive" "$staging/restored"
cmp "$staging/seed/content/blog/draft.mdx" "$staging/restored/content/blog/draft.mdx"
cmp "$staging/seed/content/uploads/blog/image.png" "$staging/restored/content/uploads/blog/image.png"
cmp "$staging/seed/data/views.json" "$staging/restored/data/views.json"
docker create --name "$recovered" --user 0 -v /app/content -v /app/data --entrypoint sh "$image" -c 'cat /app/content/blog/draft.mdx /app/content/uploads/blog/image.png /app/data/views.json' >/dev/null
docker cp "$staging/restored/content/." "$recovered:/app/content"
docker cp "$staging/restored/data/." "$recovered:/app/data"
docker start -a "$recovered" > "$staging/recovered.txt"
printf 'private draft\nimage fixture\n{"views":7}\n' > "$staging/expected.txt"
cmp "$staging/expected.txt" "$staging/recovered.txt"
echo 'Docker recovery drill passed: draft, uploaded image and view data restored in a fresh container.'
