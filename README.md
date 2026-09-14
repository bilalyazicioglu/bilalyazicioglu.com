# Personal Portfolio & Blog Studio

Modern, ultra-secure personal website and blog built with **Next.js 16 (App Router & Turbopack)**, **TypeScript**, **Tailwind CSS**, and **MDX**.

---

## 🚀 Features

- **Blazing Fast Static & Dynamic Rendering**: Prerendered static pages with on-demand ISR for dynamic blog views and runtime post publishing.
- **Stealth Multi-Factor Admin Studio**:
  - Camouflaged behind a dynamic secret route (`[adminSecret]`) that returns a clean **404 Not Found** to the public internet and automated crawlers.
  - Requires a secret query key (`?key=...`) to even render the login portal.
  - Multi-factor authentication: **Username + Password + Secondary Static Security PIN**.
  - Protected against timing attacks via constant-time byte comparisons (`crypto.timingSafeEqual`).
  - Zero SQL database = **0% SQL Injection attack surface**.
  - Built-in rate limiter (5 failed attempts locks the client IP for 15 minutes).
  - Stateless HMAC-SHA256 signed cookies (`HttpOnly`, `SameSite=Strict`, `Secure`).
- **Live Dual-Pane MDX Editor**:
  - Left pane: Frontmatter controls (Title, Slug, Excerpt, Date, Language, Tags, Draft toggle, Translation Key) + Markdown textarea.
  - Right pane: Instant live preview rendered with the exact typography, fonts (`IBM Plex Mono` & `IBM Plex Sans`), and theme styling of the real blog.
  - **Drag-and-Drop Image Upload**: Drop images directly into the editor; they are sanitized, saved to `public/uploads/blog/`, and inserted into the cursor position automatically.
  - **Interactive MDX Cheatsheet**: One-click drawer with copyable templates for headings, Rust/TS code blocks, blockquotes, tables, and media.
- **Bilingual Translation Pairing (`translationKey`)**:
  - Write articles in Turkish (`tr`) and English (`en`) linked by a common `translationKey`.
  - In the **"All (Tümü)"** feed, paired posts appear only once with a `TR · EN` badge, eliminating duplicate entries.
  - Category filters display the respective language version cleanly.
  - Automatic on-page language switcher banner and Google `hreflang` / alternate metadata for international SEO.
- **Observability Stack**: Built-in Prometheus metrics (`/metrics`), Grafana dashboard, Loki, Promtail, and Node Exporter.

---

## 🛠️ Getting Started (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

In local development, the admin studio is available at:
```text
http://localhost:3000/admin-studio?key=dev-secret-key
```
*(Default dev credentials: user: `admin`, pass: `admin12345`, pin: `0000`)*

---

## 🔐 Environment Configuration

Create a `.env` file in the project root (see `.env.example` for reference):

```env
# 1. Stealth Path Configuration
ADMIN_SECRET_SLUG="your-secret-slug"

# 2. Stealth Gate Key (required in URL query: ?key=your-key)
ADMIN_ACCESS_KEY="your-secret-gate-key"

# 3. Authentication Credentials
ADMIN_USERNAME="your-username"
ADMIN_PASSWORD="your-strong-password"

# 4. Secondary Multi-Factor PIN
ADMIN_SECURITY_PIN="1234"

# 5. Session Cryptographic Secret (64-char random hex string)
ADMIN_SESSION_SECRET="generate-via-crypto-randomBytes-32-hex"

# 6. Optional: Content Directory Path (Defaults to src/content/blog)
# BLOG_DIR_PATH=/app/content/blog
```

---

## 🐳 Docker Deployment & Automatic Content Seeding

The application is containerized and optimized with a multi-stage Docker build running as an unprivileged `nextjs` user.

### Where Posts Live in Production
- In production, runtime-created posts live on the persistent Docker volume `content-data` mounted at `/app/content/blog`.
- `docker-entrypoint.sh` automatically compares git-tracked seed posts (`content-seed`) with the volume on every container startup. Any new post added in git is **automatically copied into the volume without overwriting existing server edits**.

### Deploying / Updating on VPS

```bash
# Pull latest code
git pull

# Rebuild and restart the blog service
docker compose up -d --build blog
```

---

## 📊 Monitoring Stack

Start the application along with Prometheus and Grafana:

```bash
GRAFANA_ADMIN_PASSWORD="your-secure-password" docker compose up -d --build
```

- **Grafana**: `http://localhost:3001` (login: `admin` / your password)
- **Prometheus**: `http://localhost:9090` (localhost only)
- **Node Exporter**: Metrics on CPU, memory, disk, and network I/O

---

## 🔒 Repository & Branch Protection (Securing Git)

By default, GitHub only allows the repository owner and explicitly invited collaborators to push code. To ensure that **no one can push directly to `main` without authorization or rewrite history**:

1. Go to your repository on GitHub: **Settings → Branches** (or **Rulesets**).
2. Click **Add branch ruleset** (or **Add branch protection rule**).
3. Target branch: `main`.
4. Enable the following protections:
   - ✅ **Restrict updates / pushes**: Only allow `bilalyazicioglu` to push.
   - ✅ **Block force pushes**: Disables `git push --force` to prevent overwriting history.
   - ✅ **Do not allow deletions**: Prevents accidental deletion of the `main` branch.
   - ✅ **Require a pull request before merging** *(optional, if collaborating with others)*.

---

## 📄 License

Private & Personal Portfolio of Ahmet Bilal Yazıcıoğlu. All rights reserved.
