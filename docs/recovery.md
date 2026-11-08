# Releases and recovery

Additional cloud budget is $0. These operations use the existing Docker host, local disk and static Cloudflare fallback. No paid storage, monitoring or Load Balancer is created.

## Deployment

A successful deployment installs the daily backup cron entry when `crontab` is available; failure is reported in its log.

CI checks the application and Docker build before the homeserver deploy job runs. The job executes the tested script from its checkout against `/home/bilal/portfolio`. `scripts/deploy.sh <tested-sha>` serializes with backup/restore operations, skips obsolete CI jobs, builds a commit-tagged image and starts an isolated candidate using read-only production volumes. It checks the release SHA, homepage, blog and CV before stopping the running application. The candidate has no public port and no admin secrets.

After the candidate passes, legacy blog uploads are copied additively into persistent content storage. The running app is stopped gracefully, content and view data are backed up and the archive is restored into a temporary directory to verify every file hash. Only then is the candidate activated. The same checks run again. Failure restores the previous image automatically, retaining content volumes. The Cloudflare snapshot can serve during this brief switch; this is not zero downtime for existing connections or admin writes.

Previous/current image IDs and activation timestamps are private files under `.operations/`. Never prune images referenced by those files. Schema migrations that an older image cannot read require a separate recovery plan; automatic image rollback does not revert content. This deployment intentionally updates only the blog: monitoring/Tunnel changes must be applied separately after review.

Manual image rollback:

```sh
cd /home/bilal/portfolio
scripts/rollback.sh
```

The script checks the target before recording the change; on failure it brings back the image that was running. A bare `docker compose up` does not read `.operations/`: for manual recreation export `BLOG_IMAGE=$(cat .operations/current-image)` and `DEPLOYED_AT=$(cat .operations/current-activated-at)` first. Prefer the release scripts. Do not use `docker compose down -v`.

## Backups

```sh
scripts/backup-content.sh
python3 scripts/backup.py verify .operations/backups/<archive>.tar.gz
scripts/install-backup-cron.sh
```

The first command briefly stops the app to get a consistent filesystem snapshot and restarts it even if backup fails. Deploys also take a backup before replacement. The cron installer schedules it daily at 03:17 server time, with output in `.operations/backup.log`. It must run as the Docker user on the homeserver; cron must be installed and active. Watch available disk space; archives are retained rather than silently deleted.

Archives contain blog MDX, offline data/media, blog uploads, view data and SHA-256 file checksums. `.env`, credentials, monitoring databases and container settings are excluded. Backups may contain drafts and private media: do not commit or upload them publicly. A same-disk backup does not survive loss of the host. From another trusted machine:

```sh
scripts/pull-backups.sh bilal@homeserver /private/path/portfolio-backups
```

This copies archives over SSH and verifies them. Keep credentials separately in a private password manager. Neither cron installation nor an off-host backup is claimed complete until executed and checked on those machines.

## Restore drill (safe: no production writes)

```sh
python3 scripts/backup.py restore /path/backup.tar.gz /tmp/portfolio-restore-drill
```

Destination must be empty. It rejects traversal, symlinks, duplicate archive entries and checksum mismatches; compare an article, uploaded image and view count after restoration. CI tests round trips, corruption and malicious archives. A real Docker fixture drill validates container copying separately.

Disaster recovery on the existing stopped/running blog container:

```sh
scripts/restore-content.sh /path/backup.tar.gz
```

This validates into private staging first, stops the app, takes a safety backup, replaces only content/data volumes and restarts the application. Check `/api/status`, `/blog`, an uploaded image and private editing afterwards. The script never restores environment secrets. Keep the app closed to editing during recovery. If the final restart fails, retained backups and volumes are available for diagnosis; no success is implied.

## Public status

`/infra` checks `/api/status` once per minute while visible. It reports the backend of that request, public commit SHA, build time and activation time when recorded. No internal addresses or credentials are returned. Cloudflare's static snapshot has a build timestamp, but activation time is unknown (shown as not recorded). This is request-local visibility, not externally measured uptime or a durable incident history. Live Prometheus metrics exist only on the homeserver.
