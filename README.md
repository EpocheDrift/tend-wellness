# Tend

A wellness practitioner booking management system with an AI-driven automation layer. Designed as a demo — shows how an owner-controlled Harness handles the full client journey from inquiry to booked session, with the right actions automated and the right decisions escalated to you.

---

## How it works

```
Client submits inquiry
  → Harness sends intake email        [auto]
  → Client replies with info
  → Harness moves case to fit review  [direct transition]
  → Owner reviews + approves fit      [draft — you approve]
  → Harness proposes time slots       [auto]
  → Client selects a slot
  → Owner approves confirmation       [draft — you approve]
  → Booked ✓
```

Three automation levels:
- **auto** — Harness executes immediately, no input needed
- **draft** — Harness prepares an email, you approve/edit/reject before it sends
- **manual** — Harness steps back and escalates to you

---

## Stack

- **Next.js 16** (App Router) + TypeScript
- **In-memory store** — no database, resets on restart
- **MiniMax-M2.5** (CN node) via OpenAI-compatible SDK — agent decisions
- **Caddy** — reverse proxy + automatic SSL in production

---

## Local development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open `http://localhost:3000/dashboard`.

**Optional — enable real AI:**

```bash
# .env.local
MINIMAX_API_KEY=your_key_here
```

Without the key, the Harness uses a deterministic heuristic fallback. The happy path works either way.

---

## Interfaces

| URL | What it is |
|---|---|
| `/dashboard` | Owner dashboard — case list, timeline, draft approvals |
| `/inbox` | Mock inbox — view system emails, simulate client replies |
| `/entry-form.html` | Client booking inquiry form (Squarespace embed) |
| `/select-time?case_id=<id>` | Client time slot selection page |

---

## Seed data

On every server start, 4 cases are pre-loaded:

| Client | State | Purpose |
|---|---|---|
| Jane Kim | `fit_review` | Pending draft approval — good for quick demo |
| Tom R. | `cancel_requested` | Escalated to owner — shows system boundaries |
| Marcus L. | `awaiting_client_confirmation` | Waiting on client — shows auto-handled state |
| Sarah M. | `booked` | Completed — shows end state |

---

## Production deployment

Images are built and pushed to `ghcr.io/epochedrift/tend-wellness:latest` on every push to `main` via GitHub Actions.

**On the server:**

```bash
# First time
docker compose pull
docker compose up -d

# After each deploy
docker compose pull && docker compose up -d
```

Server expects a `.env` file in the same directory as `docker-compose.yml`:

```
MINIMAX_API_KEY=your_key_here
```

Caddy handles SSL automatically. Add to Caddyfile:

```
tend.chaostudio.org {
    reverse_proxy localhost:3000
}
```

---

## Docs

| Document | What it covers |
|---|---|
| `docs/DEMO_GUIDE.md` | Full local usage walkthrough |
| `docs/DemoOperationLine.md` | Demo script — 4 operation lines with timing |
| `docs/Design/System Design/Design_SSOT.md` | Authoritative system spec — states, API contracts, schema |
| `docs/Design/System Design/ImplementationContext.md` | Build decisions, phase order, stack rationale |
