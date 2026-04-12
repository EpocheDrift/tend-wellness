# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tend Wellness is a **booking management system** for a wellness practitioner ("Zayn Line"). This repo contains:
1. **System design documentation** — the authoritative source of truth for architecture, state machine, API contracts, and DB schema
2. **Three UI prototype applications** — Figma-generated React/TypeScript apps for the owner dashboard and client-facing interfaces

There is no backend implementation in this repo yet — it is currently design docs + UI drafts.

## Authoritative Reference

`docs/Design/System Design/Design_SSOT.md` is the single source of truth for all system details. It supersedes any Notion pages or older uploaded files. When uncertain about any system detail (states, API contracts, DB schema), consult this document first.

Key sections in `Design_SSOT.md`:
- **Section 1 — Harness Blueprint**: Agent/Harness/Application architecture, 11 booking states, transition table
- **Section 2 — API Contracts**: REST endpoint specs
- **Section 3 — DB Schema**: Aligned to Pivot 2 scope

## Design Architecture

The system follows a three-layer pattern:
```
Agent       — reasons, selects actions from allowed_actions list
Harness     — execution loop, context injection, state transitions, policy enforcement
Application — defines states, events, actions, data models
```

Core rule: **State transitions are deterministic Harness code — never driven by the Agent.**

The 11 booking states: `new_lead → intake_pending → fit_review → fit_confirmed → awaiting_client_confirmation → booked → completed` (plus cancellation/reschedule branches).

## UI Applications

Three independent React apps under `docs/drafts/Interfaces/`:

| Directory | Purpose |
|---|---|
| `Owner_Dashboard_v2/` | Practitioner-facing case management dashboard |
| `EndUser_Interface-Entry_Form_v2/` | Client booking inquiry form |
| `EndUser_Interface-Slot_Selection_Page_v2/` | Client time slot selection page |

Design prompts that specify what each UI should do: `docs/Design/Interfaces/`

### Running an app

```bash
cd docs/drafts/Interfaces/<app-directory>
npm install
npm run dev    # development server
npm run build  # production build
```

### Tech Stack (all three apps)

- React 18 + TypeScript, Vite 6
- Tailwind CSS 4 (Vite plugin, no separate config file)
- Radix UI primitives + shadcn-style components in `src/app/components/ui/`
- Material UI (`@mui/material`) for some components
- React Hook Form, React Router 7, Recharts, React DnD
- Path alias: `@` → `./src`

### App Structure

Each app follows the same layout:
```
src/
  main.tsx              # entry point
  app/
    App.tsx             # root component
    components/
      ui/               # ~50 reusable shadcn-style primitives
      figma/            # Figma-generated image components
      *.tsx             # feature components
  styles/               # tailwind.css, theme.css, fonts.css, index.css
```

`vite.config.ts` includes a custom `figmaAssetResolver` plugin for resolving Figma-exported assets — do not remove it.

## Backend (Planned — Next.js App)

The production implementation will be a Next.js (App Router) + TypeScript app (not yet created). Key details:
- **AI Agent**: MiniMax-M2.5, CN node (`https://api.minimaxi.com/v1`), via OpenAI-compatible SDK
- **Env var**: `MINIMAX_API_KEY` (obtain from platform.minimaxi.com)
- **Data store**: In-memory JS objects (no database for demo)
- Full implementation plan: `docs/Design/System Design/ImplementationContext.md`

## What's Not Here (Yet)

- No test suite
- No lint configuration
- No Next.js backend (design + prototypes only at this stage)
- No deployment config
