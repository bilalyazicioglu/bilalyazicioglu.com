#!/usr/bin/env bash
# Run on the homeserver as the same user that runs Docker.
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")/.."
command -v flock >/dev/null
command -v python3 >/dev/null
mkdir -p .operations/backups
chmod 700 .operations
entry="17 3 * * * cd $(pwd) && bash scripts/backup-content.sh >> .operations/backup.log 2>&1 # portfolio-backup"
(crontab -l 2>/dev/null | sed '/# portfolio-backup$/d' || true; echo "$entry") | crontab -
echo 'Daily backup scheduled for 03:17 server time. Copy backups to a second machine.'
