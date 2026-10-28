# Deployment and publishing

## Vercel deployment

Import `bilalyazicioglu/bilalyazicioglu.com` from GitHub into a personal Vercel Hobby project. Use the Next.js preset, repository root, Node.js 22 and the default install/build settings. No homeserver `.env` or admin credentials are needed. Vercel provides `VERCEL=1` automatically; do not set it in the Docker deployment.

On Vercel, posts and offline content come from Git. The file-backed admin panel, uploads and view tracking are disabled. View counts are hidden rather than stored on temporary function disks. GitHub stars use an hourly request cache; the private Prometheus service is not queried and `/infra` explains the hosting change. The Docker deployment retains its existing storage and admin behavior.

Check the generated `vercel.app` deployment before switching DNS: homepage, `/about`, `/projects`, `/blog`, an article, `/offline`, CV download, and the terminal edition. Add `bilalyazicioglu.com` and `www.bilalyazicioglu.com` in Vercel's project domain settings, then apply the exact DNS records Vercel displays in Cloudflare. Replace only the website records currently pointing to the tunnel; keep email and other service records. Keep Cloudflare as the DNS provider. Also add `tincan.rs` and `www.tincan.rs` if moving that site, since the main site links to it.

GitHub integration deploys future pushes independently of the homeserver runner. Files changed only on the homeserver content volume are not present in a Git import; recover them after home connectivity returns. Do not copy the homeserver's environment file into Vercel.

## Configuration

For local development, copy `.env.example` to `.env.local`. For Docker Compose, use `.env` in the repository root so Compose can substitute the configured values.

| Variable | Purpose |
| --- | --- |
| `ADMIN_SECRET_SLUG` | Configurable studio route segment |
| `ADMIN_ACCESS_KEY` | Query key used to open the studio login page |
| `ADMIN_USERNAME` | Studio login name |
| `ADMIN_PASSWORD` | Studio login password |
| `ADMIN_SECURITY_PIN` | Additional static login PIN |
| `ADMIN_SESSION_SECRET` | Secret used to sign session tokens |
| `BLOG_DIR_PATH` | Optional content directory override; Compose sets `/app/content/blog` |
| `ADMIN_TAILNET_HOST` | Expected hostname for the optional Tailnet access path |
| `ADMIN_TAILSCALE_LOGIN` | Optional allowed Tailnet login identity |
| `CLOUDFLARE_TUNNEL_TOKEN` | Token for the `cloudflared` service; required by Compose |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password; required by Compose, with no default |
| `PROMETHEUS_URL` | Where `/infra` reads metrics; defaults to `http://prometheus:9090` on the Compose network |

Generate a session secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use your own credentials and session secret in production. The sample configuration and built-in development defaults are for local setup.

## Publishing studio

The configurable login route is `/<ADMIN_SECRET_SLUG>?key=<ADMIN_ACCESS_KEY>`. Authentication uses a username, password, static PIN, and a signed session cookie. A password and static PIN are both knowledge-based credentials; this flow is not multi-factor authentication.

The application also supports a Tailnet access path. Its host and identity checks use request headers, so deployments using this path must ensure those headers come from a trusted proxy and that clients cannot access the application port directly. See [`admin-gate.ts`](../src/lib/admin-gate.ts) and [`admin-auth.ts`](../src/lib/admin-auth.ts) for the current behavior.

## Deploy or update the application

After configuring `.env`, run the deploy script on the server:

```sh
scripts/deploy.sh
```

It pulls `main`, rebuilds the blog image with the commit's SHA, subject and time baked in (shown on `/infra`), recreates the exporters if their configuration changed, reloads Prometheus's config, and then waits until `/api/infra` reports the new commit. If that check fails, it prints the last log lines and exits non-zero. A plain `docker compose up -d --build blog` still works, but `/infra` then shows no commit.

Public traffic reaches the app through the `cloudflared` service, which dials out to Cloudflare and talks to the app over the Compose network; tunnel routes in the Cloudflare dashboard point at `http://blog:3000`. The app's port is bound to `127.0.0.1:3000` only, for `tailscale serve` on the host. Do not publish it more widely, including from a `docker-compose.override.yml`: the admin gate trusts headers that anyone who can reach the port could forge.

### Security updates (2026-10-26)

The deploy script pulls a fresh Node base image before rebuilding. CI rejects npm dependencies with known high or critical advisories. These checks do not scan container images or prove that a deployed host is uncompromised.

Cloudflared must be at least 2026.10.2 (2026.10.3 on macOS without Homebrew); this checkout pins the Docker image to 2026.10.3. See [Cloudflare's certificate incident](https://blog.cloudflare.com/emudhra-certificate-compromise/). Updating this file alone does not update a running connector. Before restarting a single connector, add a temporary replica through the Cloudflare dashboard on a second host or container and confirm it is connected. On the deployment host, after updating this checkout:

```sh
docker compose pull cloudflared
docker compose up -d --no-deps cloudflared
docker compose exec -T cloudflared cloudflared --version
docker compose logs --tail 50 cloudflared
```

Confirm the replacement connector is connected and the tunnel is Healthy in Cloudflare before removing the temporary replica. Existing long-lived connections can still drop. Repeat for every tunnel and connector; the account-wide inventory is in the Cloudflare dashboard. If a route uses an HTTPS origin, check its certificate chain first and replace affected eMudhra certificates. Never bypass certificate checks with `noTLSVerify`. The documented blog origin is HTTP inside the Compose network, so that specific origin does not have an HTTPS certificate chain to replace.

The application must also be rebuilt and deployed to activate the Next.js security fixes; see the [October advisory](https://nextjs.org/blog/nextjs-security-update-october-14-2026). A valid, private `ADMIN_SESSION_SECRET` is required; sessions are rejected when it is missing in production.

Remaining infrastructure work: [Promtail reached end of life on March 2, 2026](https://grafana.com/docs/loki/latest/send-data/promtail/), and needs migration to Alloy. Loki and Promtail currently use mutable `latest` tags. The live host, all running image digests, OS patches, container vulnerability scan, origin TLS settings and other Cloudflare connectors must be inspected separately before claiming the whole deployment is patched.

Promtail discovers containers through `docker-socket-proxy`, which allows only read-only container and network lookups, rather than through the Docker socket itself.

### Automatic deploys

Every push to `main` that passes CI is deployed by the `deploy` job in `.github/workflows/ci.yml`. It runs on the server through a self-hosted GitHub Actions runner labelled `homeserver`, which calls `scripts/deploy.sh <sha>` with the exact commit CI tested. Pull requests never reach the runner. Because the repository is public, *Settings → Actions → General → Fork pull request workflows* must require approval for all external contributors.

To set up the runner, open *Settings → Actions → Runners → New self-hosted runner* (Linux x64) on GitHub and follow its download and `config.sh` steps on the server, adding `--labels homeserver` to `config.sh`. Then install it as a service with `sudo ./svc.sh install <user> && sudo ./svc.sh start`. The runner's user needs to own the checkout at `~/portfolio` and to run `docker` without `sudo`.

## Persistent data

| Data | Location | Persistence in the supplied Compose file |
| --- | --- | --- |
| Published MDX posts | `/app/content/blog` | `content-data` volume mounted at `/app/content` |
| View-count data | `/app/data` | `views-data` volume |
| Uploaded images | `/app/public/uploads/blog` | No dedicated volume configured |

On each container start, the entrypoint copies seed posts whose filenames are missing from the content directory. Existing files are preserved, including edits made through the studio. Updating an existing post in Git therefore does not overwrite the production copy automatically.

Back up the content and view-count volumes before replacing or migrating a deployment. Uploaded images need their own persistent storage arrangement and backup; the supplied Compose file does not preserve them across container replacement. Avoid `docker compose down -v` when retaining published content.

## Monitoring

To start the application and the included monitoring services, configure `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` in `.env`, then run:

```sh
docker compose up -d --build
```

- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`
- Loki: `http://localhost:3100`

These ports bind to loopback in the supplied Compose file.

The public `/infra` page reads from Prometheus over the Compose network, never from the browser. It sends only fixed queries, caches live values for 5 seconds and history for 60, and deliberately leaves out hostnames, IPs, ports, versions, kernel version and host uptime. A service shows as *unknown* until Prometheus has a scrape target for it. Node Exporter and Promtail use host mounts intended for a Linux Docker host; review the Compose configuration before running the full monitoring stack on another platform.
