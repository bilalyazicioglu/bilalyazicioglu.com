# Deployment and publishing

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

Generate a session secret with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Use your own credentials and session secret in production. The sample configuration and built-in development defaults are for local setup.

## Publishing studio

The configurable login route is `/<ADMIN_SECRET_SLUG>?key=<ADMIN_ACCESS_KEY>`. Authentication uses a username, password, static PIN, and a signed session cookie. A password and static PIN are both knowledge-based credentials; this flow is not multi-factor authentication.

The application also supports a Tailnet access path. Its host and identity checks use request headers, so deployments using this path must ensure those headers come from a trusted proxy and that clients cannot access the application port directly. See [`admin-gate.ts`](../src/lib/admin-gate.ts) and [`admin-auth.ts`](../src/lib/admin-auth.ts) for the current behavior.

## Deploy or update the application

After configuring `.env`:

```sh
git pull --ff-only
docker compose up -d --build blog
```

The checked-in Compose file binds the application to `127.0.0.1:3000`. Configure the reverse proxy for your environment. A proxy running in another container needs a suitable container-network configuration; the host's loopback address is not that container's loopback address.

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

These ports bind to loopback in the supplied Compose file. Node Exporter and Promtail use host mounts intended for a Linux Docker host; review the Compose configuration before running the full monitoring stack on another platform.
