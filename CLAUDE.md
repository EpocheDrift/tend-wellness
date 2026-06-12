# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tend Wellness is a **booking management system** for a wellness practitioner ("Zayn Line"), built as a demo. The repo root is a **fully implemented Next.js 16 (App Router) + TypeScript app** — an AI-assisted booking workflow where an Agent proposes actions and a deterministic Harness executes them under policy control. The repo also contains the system design docs and the original Figma-generated UI prototypes that the app was built from.

## Commands

```bash
npm install
npm run dev      # dev server (webpack mode) — http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

There is no test suite. Verify changes by running the app and walking the demo happy path (see `docs/DEMO_GUIDE.md`).

`MINIMAX_API_KEY` in `.env.local` enables real AI agent decisions; without it, the Harness falls back to deterministic heuristics — the happy path works either way.

## Architecture

Three-layer pattern:

```
Agent       — reasons, selects actions from allowed_actions list (lib/harness/agent.ts)
Harness     — execution loop, context injection, state transitions, policy enforcement (lib/harness/)
Application — defines states, events, actions, data models (lib/types.ts)
```

Core rules:
- **State transitions are deterministic Harness code — never driven by the Agent.** The transition table lives in `lib/harness/transitions.ts`.
- Every action has an automation level in `lib/harness/policy.ts`: **auto** (execute immediately), **draft** (owner approves before send), **manual** (escalate to owner).
- The Agent may only choose from the current state's `ALLOWED_ACTIONS` whitelist.

The 11 booking states: `new_lead → intake_pending → fit_review → fit_confirmed → awaiting_client_confirmation → booked → completed` plus cancellation/reschedule branches. **Implemented scope (Pivot 2) is the happy path only** — cancel/reschedule flows are designed but not implemented.

### Key paths

| Path | Purpose |
|---|---|
| `lib/harness/on-event.ts` | Core event loop: validate event → run agent (max 5 iterations) → policy check → execute/draft/escalate |
| `lib/harness/transitions.ts` | Deterministic state transition table |
| `lib/harness/policy.ts` | `ALLOWED_ACTIONS` per state + auto/draft/manual policy (re-exported by `lib/policy.ts`) |
| `lib/store/index.ts` | In-memory store (`globalThis` singleton, resets on restart) |
| `lib/seed/index.ts` | 4 seed cases loaded on startup |
| `app/dashboard/` | Owner dashboard (case list, timeline, draft approval; 3s polling) |
| `app/inbox/` | Mock inbox — view system emails, simulate client replies |
| `app/select-time/` | Client slot-selection page (`?case_id=...`) |
| `public/entry-form.html` | Self-contained client inquiry form (Squarespace embed), posts to `/api/webhooks/squarespace` |
| `app/api/` | REST routes: cases, timeline, drafts (approve/reject/edit-and-approve), events, webhooks (squarespace/email/scheduler), inbox, reset, health |

Frontend fetches must use **relative paths** (`fetch('/api/cases')`) — absolute URLs break in Docker.

## Authoritative Reference

`docs/Design/System Design/Design_SSOT.md` is the single source of truth for system design (states, API contracts, DB schema). When the code and the SSOT disagree on intent, consult the SSOT first.

Other key docs:
- `docs/Design/System Design/ImplementationContext.md` — build decisions, phase order, stack rationale
- `docs/Design/System Design/DockerDeploy.md` — deployment guide
- `docs/DEMO_GUIDE.md` / `docs/DemoOperationLine.md` — demo walkthrough and 4-line demo script (~4 min)

The `docs/` directory is read-only reference material — implementation changes go in the app, not in docs (update docs only when the design itself changes).

## Deployment

- GitHub Actions (`.github/workflows/deploy.yml`) builds and pushes `ghcr.io/epochedrift/tend-wellness:latest` on every push to `main`.
- `Dockerfile` is a multi-stage build using Next.js `output: 'standalone'` (set in `next.config.ts` — do not remove).
- On the server: `docker compose pull && docker compose up -d`; the app binds `127.0.0.1:3000` behind Caddy (`tend.chaostudio.org`). `MINIMAX_API_KEY` comes from a server-side `.env` next to `docker-compose.yml`.

## UI Prototypes (reference only)

Three Figma-generated Vite + React apps under `docs/drafts/Interfaces/` (`Owner_Dashboard_v2/`, `EndUser_Interface-Entry_Form_v2/`, `EndUser_Interface-Slot_Selection_Page_v2/`). They are the design reference the production pages were ported from — they are not part of the running app. Each runs standalone with `npm install && npm run dev` from its directory. Design prompts: `docs/Design/Interfaces/`.

## What's Not Here (Yet)

- No test suite
- No database — in-memory store only; all data resets on restart (`POST /api/reset` re-seeds on demand)
- No cancel/reschedule flow implementation (designed in SSOT only)
- No auth — the demo is unauthenticated
