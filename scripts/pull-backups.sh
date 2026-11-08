#!/usr/bin/env bash
# Run from a second machine; archive contents include drafts/private media.
set -euo pipefail
host=${1:?usage: scripts/pull-backups.sh ssh-host destination-directory}
destination=${2:?choose a private destination outside the public repository}
umask 077
mkdir -p "$destination"
rsync -az --chmod=D700,F600 "$host:/home/bilal/portfolio/.operations/backups/" "$destination/"
for archive in "$destination"/*.tar.gz; do
  [ -f "$archive" ] || continue
  python3 "$(dirname "$0")/backup.py" verify "$archive"
done
