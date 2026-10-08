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

## Run locally

Use Node.js 22 and npm; the Docker build uses the same Node.js major version.

```sh
git clone https://github.com/bilalyazicioglu/bilalyazicioglu.com.git
cd bilalyazicioglu.com
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). The public site runs without an environment file. To configure the publishing studio, copy `.env.example` to `.env.local` and replace the example values.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate route types and run the TypeScript compiler |
| `npm test` | Run the Vitest suite once (`npm run test:watch` to watch) |

## Structure

```text
src/app/          Pages, layouts, and API routes
src/components/   Site interface and interactive components
src/content/blog/ Versioned MDX posts used to seed deployments
src/lib/          Content, authentication, metrics, and view-count utilities
public/           Static assets
monitoring/       Prometheus and Grafana configuration
scripts/          Content and deployment support scripts
```

## Deployment

The application runs in Docker with separate volumes for posts and view counts. The repository also includes a monitoring stack.

See [deployment and publishing](docs/operations.md) for configuration, storage behavior, and update commands.

## License

[MIT](LICENSE) © 2026 Ahmet Bilal Yazıcıoğlu.
