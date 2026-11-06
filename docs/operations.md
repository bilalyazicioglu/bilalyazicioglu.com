# Cloudflare fallback deployment

Additional cloud budget: **$0**, on Workers Free. See [cost limits and deployment checks](cost-policy.md). `npm run deploy` checks the policy before publishing; adding new service bindings requires review.

`main` is the homeserver application. `cloudflare-workers` is the separate static fallback; do not merge this branch into main. It produces Next.js HTML, client JavaScript, public assets, a published post index and terminal text at build time. A small Worker serves those assets and preserves domain routing. No Node.js server, tunnel, admin service or writable content volume runs in Cloudflare.

## Connect GitHub to Workers Builds

1. In Cloudflare, open **Workers & Pages → Create → connect/import a Git repository** and choose `bilalyazicioglu/bilalyazicioglu.com`.
2. Use Worker name **bilal-blog**, matching `wrangler.jsonc`.
3. Set the production branch to **cloudflare-workers**, not the repository default main. Disable preview builds from other branches so the homeserver code is not built as a Worker.
4. Keep the root directory at the repository root. Use Node.js 22.
5. Build command: `npm run build && npm run verify:static`.
6. Deploy command: `npm run deploy`.
7. No application environment variables or secrets are required. In particular, do not import the homeserver `.env`.

Cloudflare's GitHub integration supplies deployment authorization; do not commit an API token. First open the generated `workers.dev` URL and verify the homepage, CV, projects, blog, article, offline page, terminal and `/infra`.

## Automatic failover

The four public website routes remain attached to `bilal-blog`. With `PRIMARY_ENABLED=true` (set in `wrangler.jsonc`), the Worker first forwards the incoming request to the homeserver through the existing Tunnel DNS. Cloudflare same-zone origin subrequests bypass the Worker route, so this does not recurse. The `workers.dev` URL always serves the static snapshot for diagnosis.

A network failure, 5xx response or failure to receive headers within 2.5 seconds sends GET/HEAD traffic to static assets. Once a host fails, requests use the fallback for 30 seconds before trying a HEAD health probe on that host's homepage. Three consecutive successful probes at least 30 seconds apart allow primary traffic again. A failed probe resets the recovery count. Checks are driven by visitor requests; no traffic means no background polling. State is per Cloudflare isolate and hostname, not globally coordinated: a fresh isolate starts with a bounded primary attempt. The snapshot remains available even if that attempt fails.

Genuine 4xx responses pass through and do not trigger failover. Writes are sent at most once and never replayed against the snapshot. During an outage they receive HTTP 503, or the original upstream failure response if it reached the server. Admin editing and runtime APIs exist only on the primary.

Bundled fallback JS/CSS remains available after recovery. Successful primary `/_next/static/` responses are cached in Cloudflare's local asset cache where possible. Already-open pages requesting an uncached primary-only chunk during an outage may need a reload to use the static snapshot.

Inspect `X-Blog-Backend` on page responses: `homeserver` or `static-fallback`. To force static hosting, set `PRIMARY_ENABLED=false` and deploy. No health-check service, persistent database or paid Load Balancer is required; normal Workers request/CPU quotas apply.

The existing proxied Tunnel DNS records remain unchanged. The current routes cover `bilalyazicioglu.com/*`, `www.bilalyazicioglu.com/*`, `tincan.rs/*` and `www.tincan.rs/*`. Unknown paths and admin/API writes in the static deployment do not become successful HTML responses.

## Content and limitations

Publish posts and offline data through Git on this branch and let Workers Builds redeploy. Only published posts are exported. Admin routes, uploads, metrics and view tracking have no runtime endpoints. GitHub star counts are captured during the build. `/infra` explains that the normal homeserver deployment was temporarily moved after a home internet outage longer than one hour.

Only Git-tracked content and public assets are available. Posts and uploads changed only on the homeserver volume must be recovered after connectivity returns. Never deploy source files as assets: Wrangler uploads only `out/`.

## Local checks

```sh
npm ci
npm test
npm run lint -- --max-warnings=0
npm run build
npm run verify:static
npm run check:worker
npm run preview
```

`npm run deploy` publishes an already-built `out/` directory. Rebuild first when deploying manually. `npm run check:worker` only bundles locally and does not publish. The Docker files and monitoring configuration inherited from main are not used by this branch.

## Bypass the Worker entirely

Automatic recovery already returns healthy traffic to the homeserver. To remove the failover layer entirely, explicitly delete its four routes in Cloudflare's Domains & Routes panel (or the routes API), then keep `routes: []` in this branch so future deploys do not add them again. An empty Wrangler array alone did not remove existing zone routes during our earlier rollback. The unchanged Tunnel DNS records then carry traffic directly. Keep this branch separate from main.
