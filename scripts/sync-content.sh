#!/usr/bin/env bash
#
# Pull what was written from /admin back down.
#
# In production the content volume is the source of truth: /admin writes .mdx
# files straight onto it, so anything published from the phone exists only on
# the VPS until this script copies it down. Run it now and then, review the
# diff, and commit.
#
# It also copies down what the studio keeps for /offline: offline.json (small,
# text, worth committing: it is the seed the image starts from) and the photos
# and covers uploaded there. Those go to src/content/offline-media/, which git
# ignores on purpose: they are not for the repository, which is public. That
# folder is also where `npm run dev` looks for them, so after a sync the local
# page shows the real photos. It is the only other copy of them besides the
# volume, so keep it (or back it up) like anything you care about.
#
# Usage:
#   ./scripts/sync-content.sh                  # uses $BLOG_VPS_HOST
#   ./scripts/sync-content.sh my-vps           # tailnet name or ssh alias
#   BLOG_CONTAINER=blog ./scripts/sync-content.sh my-vps
#
set -euo pipefail

HOST="${1:-${BLOG_VPS_HOST:-}}"
CONTAINER="${BLOG_CONTAINER:-blog}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$REPO_ROOT/src/content/blog"

if [ -z "$HOST" ]; then
  echo "error: no host given. Pass one as an argument or set BLOG_VPS_HOST." >&2
  echo "usage: $0 <ssh-host-or-tailnet-name>" >&2
  exit 1
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> copying posts out of the '$CONTAINER' container on $HOST"
# tar over ssh: works whether or not the volume path is readable from the host.
ssh "$HOST" "docker exec $CONTAINER tar -cf - -C /app/content/blog ." \
  | tar -xf - -C "$TMP_DIR"

if ! ls "$TMP_DIR"/*.mdx >/dev/null 2>&1; then
  echo "error: no .mdx files came back — nothing written." >&2
  exit 1
fi

echo "==> writing into $DEST"
mkdir -p "$DEST"
# Deliberately additive: never delete local files based on what the server has.
cp -a "$TMP_DIR"/*.mdx "$DEST"/

# /offline: only present once the studio has saved something. A missing file
# makes tar fail inside the container, which is fine here, hence the `|| true`.
echo "==> copying /offline's data and photos, if the studio has saved any"
for item in offline.json offline-media; do
  ssh "$HOST" "docker exec $CONTAINER tar -cf - -C /app/content $item" 2>/dev/null \
    | tar -xf - -C "$TMP_DIR" 2>/dev/null || true
done
if [ -f "$TMP_DIR/offline.json" ]; then
  cp -a "$TMP_DIR/offline.json" "$REPO_ROOT/src/content/offline.json"
  echo "    offline.json updated"
fi
if [ -d "$TMP_DIR/offline-media" ]; then
  mkdir -p "$REPO_ROOT/src/content/offline-media"
  # Additive, like the posts: nothing local is deleted.
  cp -a "$TMP_DIR/offline-media/." "$REPO_ROOT/src/content/offline-media/"
  echo "    $(ls "$TMP_DIR/offline-media" | wc -l | tr -d ' ') files in src/content/offline-media (not tracked by git)"
fi

echo "==> done. Review and commit:"
git -C "$REPO_ROOT" status --short -- src/content/blog src/content/offline.json
