#!/usr/bin/env bash
# Consistent backup; static failover serves public traffic during the short stop.
set -euo pipefail
trap 'exit 130' INT
trap 'exit 143' TERM
cd "$(dirname "$(readlink -f "$0")")/.."
umask 077
mkdir -p .operations/backups
exec 9>.operations/deploy.lock
flock -n 9 || { echo 'Another deployment/backup is running' >&2; exit 1; }
restart=false
if [ "$(docker inspect -f '{{.State.Running}}' blog)" = true ]; then
  restart=true
  docker stop -t 30 blog >/dev/null
fi
trap 'if $restart; then docker start blog >/dev/null; fi' EXIT
python3 scripts/backup.py create
