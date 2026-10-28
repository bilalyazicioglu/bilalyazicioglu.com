# Cloudflare fallback deployment

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

## Domain routing and standby

The homeserver resumed serving the public domains on 2026-10-28. `wrangler.jsonc` deliberately has `routes: []`, so deploying this branch updates only the standby `workers.dev` site. The existing proxied Tunnel DNS records remain unchanged.

To activate the fallback during another outage, replace the empty `routes` array with:

```json
"routes": [
  { "pattern": "bilalyazicioglu.com/*", "zone_name": "bilalyazicioglu.com" },
  { "pattern": "www.bilalyazicioglu.com/*", "zone_name": "bilalyazicioglu.com" },
  { "pattern": "tincan.rs/*", "zone_name": "tincan.rs" },
  { "pattern": "www.tincan.rs/*", "zone_name": "tincan.rs" }
]
```

Rebuild and deploy. The Worker handles requests before they reach the Tunnel origin and fetches only its own ASSETS binding, so the fallback does not need a connected tunnel. Check for any other Worker routes on these hostnames before activating it.

Test browser and curl requests separately. Terminal responses have `Content-Type: text/plain` and `Vary: User-Agent, Accept`; `?plain` removes ANSI escape codes. Unknown paths and admin/API writes return genuine 404s.

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

## Return to the homeserver

Leave main and its CI deployment on the homeserver. Once that origin is healthy, explicitly delete the four routes from this Worker's Domains & Routes panel (or the Cloudflare routes API), then keep `routes: []` in this branch so future deployments do not add them again. An empty Wrangler routes array alone did not remove the existing zone routes in our rollback. The unchanged Tunnel DNS records then resume carrying traffic. Keep the fallback branch for future outages. Subsequent changes on main need to be intentionally brought into this branch; pushes to main do not update this fallback.
