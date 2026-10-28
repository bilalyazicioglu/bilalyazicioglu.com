# bilalyazicioglu.com

[![CI](https://github.com/bilalyazicioglu/bilalyazicioglu.com/actions/workflows/ci.yml/badge.svg)](https://github.com/bilalyazicioglu/bilalyazicioglu.com/actions/workflows/ci.yml)

My personal website, bilingual technical blog, and interactive terminal.

[Visit the website](https://www.bilalyazicioglu.com)

## What is here

- Projects, writing, and a little more about me.
- Turkish and English MDX posts, paired through translation metadata.
- An interactive terminal for exploring the site.
- A terminal edition: `curl bilalyazicioglu.com` (also `/infra`, `/projects`, `/blog`, and `curl tincan.rs`).
- [/infra](https://bilalyazicioglu.com/infra): live numbers from the homeserver the site runs on.
- A publishing studio with a live preview and image uploads.
- Docker deployment and monitoring configuration.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · MDX

Docker Compose · Prometheus · Grafana · Loki

## Cloudflare fallback branch

This is `cloudflare-workers`, the static fallback. **`main` remains the homeserver deployment.** The site is built from Git and served directly from Cloudflare Workers Static Assets, with a small Worker for host routing and terminal responses.

```sh
npm ci
npm run build
npm run verify:static
npm run preview
```

Connect this repository in Workers Builds with production branch `cloudflare-workers`, build command `npm run build && npm run verify:static`, and deploy command `npm run deploy`. Worker name: `bilal-blog`. No application secrets are required. See [setup, custom domains and rollback](docs/operations.md).

The portfolio, projects, CV, published blog, offline page and terminal edition are included. Admin editing, uploads, view tracking and live homelab metrics are unavailable in this static deployment.

## License

[MIT](LICENSE) © 2026 Ahmet Bilal Yazıcıoğlu.
