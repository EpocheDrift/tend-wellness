> This document is written for a Code Agent. It covers everything needed to containerize the Tend demo and set up automated deployment via GitHub Actions + [ghcr.io](http://ghcr.io).
> 

---

# Context

**Target:** Package the Tend Next.js app as a Docker image, push to GitHub Container Registry ([ghcr.io](http://ghcr.io)), and deploy to a server running Ubuntu 24.04 with Caddy as reverse proxy.

**Domain:** `tend.chaostudio.org` (DNS already pointed to server IP)

**Server environment:**

- Ubuntu 24.04.4 LTS
- Docker + docker-compose already installed
- Caddy already installed (reverse proxy + SSL)
- No nginx involved

**Deployment flow:**

```
local push to GitHub
  → GitHub Actions: build image → push to ghcr.io
  → server: docker pull + docker compose up
  → Caddy: reverse proxy tend.chaostudio.org → localhost:3000
```

---

# Step 0 — Fix frontend fetch calls (prerequisite)

Before writing any Docker config, verify that **all frontend fetch calls use relative paths**, not absolute URLs.

Search the codebase for any usage of `NEXT_PUBLIC_API_BASE_URL` or `http://localhost:3000`. If found, replace with relative paths:

```tsx
// WRONG — breaks in Docker / any non-localhost environment
fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/cases`)
fetch('http://localhost:3000/api/cases')

// CORRECT — works on any domain
fetch('/api/cases')
```

This is a hard requirement. `NEXT_PUBLIC_` variables are baked into the bundle at build time. Using absolute URLs means the image only works on [localhost](http://localhost).

If the codebase already uses relative paths everywhere, skip this step.

---

# Step 1 — Dockerfile

Create `/Dockerfile` at repo root.

Use a multi-stage build to keep the final image small:

```docker
# Stage 1: deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy only what's needed to run
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

**Important:** The standalone output requires `output: 'standalone'` in `next.config.js` (or `next.config.ts`). Add this if not already present:

```tsx
// next.config.ts
const nextConfig = {
  output: 'standalone',
  // ...existing config
}
export default nextConfig
```

The standalone mode produces a minimal `server.js` that doesn't need the full node_modules to run — this is what makes the image small.

---

# Step 2 — .dockerignore

Create `/.dockerignore` at repo root:

```
node_modules
.next
.git
.env
.env.local
docs/drafts
*.zip
README.md
```

This prevents large unnecessary directories from being sent to the Docker build context.

---

# Step 3 — docker-compose.yml

Create `/docker-compose.yml` at repo root. This is used on the **server** to run the container.

```yaml
services:
  tend-app:
    image: ghcr.io/GITHUB_USERNAME/tend-wellness:latest
    env_file:
      - .env
    ports:
      - "127.0.0.1:3000:3000"
    restart: unless-stopped
```

**Notes:**

- `GITHUB_USERNAME` → replace with the actual GitHub username/org that owns the repo
- Port is bound to `127.0.0.1:3000` only — not exposed to public internet directly. Caddy handles public traffic.
- `env_file: .env` → reads `/opt/tend/.env` (or wherever docker-compose.yml lives on server). This file is NOT in Git.
- `restart: unless-stopped` → container auto-restarts on server reboot

---

# Step 4 — GitHub Actions workflow

Create `/.github/workflows/deploy.yml`:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches:
      - main

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          # Docker image names must be lowercase. `github.repository_owner` preserves the
          # account's casing (EpocheDrift), which breaks the push — hardcode lowercase instead.
          tags: ghcr.io/epochedrift/tend-wellness:latest
```

**How it works:**

- Triggers on every push to `main`
- Uses `GITHUB_TOKEN` (automatic, no setup needed) to authenticate with [ghcr.io](http://ghcr.io)
- Builds image and pushes to `ghcr.io/OWNER/tend-wellness:latest` (lowercase owner)

---

# Step 5 — .gitignore additions

Make sure `.gitignore` includes:

```
.env
.env.local
.env*.local
```

The `.env` file with the MINIMAX_API_KEY only lives on the server, never in Git.

---

# What Code Agent Does NOT Touch

The following are handled manually on the server — not part of this implementation task:

**Caddy configuration** — Add this to the server's Caddyfile:

```
tend.chaostudio.org {
    reverse_proxy localhost:3000
}
```

Caddy handles SSL automatically via Let's Encrypt.

**Server `.env` file** — Created manually on the server:

```bash
# On server, in the directory where docker-compose.yml lives
echo "MINIMAX_API_KEY=your_key_here" > .env
```

**Initial server setup** — On the server, first-time setup:

```bash
# Pull the image and start
docker compose pull
docker compose up -d
```

**Subsequent deploys** — After every push to main, on the server:

```bash
docker compose pull
docker compose up -d
```

(This can be automated later with a webhook, but manual pull is fine for demo purposes.)

---

# File Summary

| File | Action |
| --- | --- |
| `Dockerfile` | Create at repo root |
| `.dockerignore` | Create at repo root |
| `docker-compose.yml` | Create at repo root |
| `.github/workflows/deploy.yml` | Create (new directory + file) |
| `next.config.ts` | Add `output: 'standalone'` if not present |
| `next.config.js` | Same as above (whichever exists) |
| `.gitignore` | Add `.env` / `.env.local` if not already present |

---

# Verification Checklist

After Code Agent completes the above:

- [ ]  `npm run build` succeeds locally
- [ ]  `docker build -t tend-test .` succeeds locally
- [ ]  `docker run -p 3000:3000 tend-test` — app is accessible at `http://localhost:3000/dashboard`
- [ ]  No `NEXT_PUBLIC_API_BASE_URL` or `http://localhost:3000` references in frontend fetch calls
- [ ]  Push to `main` → GitHub Actions workflow runs → image appears in [ghcr.io](http://ghcr.io) packages
- [ ]  On server: `docker compose pull && docker compose up -d` → `tend.chaostudio.org` accessible