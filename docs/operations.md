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

## Domain routing

`wrangler.jsonc` attaches Worker routes to `bilalyazicioglu.com/*`, `www.bilalyazicioglu.com/*`, `tincan.rs/*` and `www.tincan.rs/*`. The existing proxied Tunnel DNS records stay in place for rollback. The Worker handles requests before they reach that origin, and fetches only its own ASSETS binding, so the fallback does not depend on a connected tunnel. There were no existing Worker routes on either zone when these routes were added.

Test browser and curl requests separately. Terminal responses have `Content-Type: text/plain` and `Vary: User-Agent, Accept`; `?plain` removes ANSI escape codes. Unknown paths and admin/API writes return genuine 404s. The separate `workers.dev` URL remains enabled for diagnosis.

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

Leave main and its CI deployment on the homeserver. Once that origin is healthy, remove the four routes from this Worker's configuration and redeploy, or remove those routes from its Domains & Routes panel. The unchanged Tunnel DNS records then resume carrying traffic. Keep the fallback branch for future outages. Subsequent changes on main need to be intentionally brought into this branch; pushes to main do not update this fallback.
