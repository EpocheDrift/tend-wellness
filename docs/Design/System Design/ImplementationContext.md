> This document is written for a Code Agent starting the Tend demo implementation. Read this before touching any code. It contains every decision, constraint, and structural detail needed to build correctly on the first pass.
> 

---

# 1. What You Are Building

A two-sided wellness booking system called **Tend**. Two surfaces:

- **End User side** — a Squarespace form (entry) and a Slot Selection Page (scheduling)
- **Owner side** — an Owner Dashboard showing case status, timeline, and draft approval

In the middle is a **Harness** — a deterministic execution engine that controls state transitions, enforces policy, and decides when to act vs. when to pause and wait for the owner.

This is **not a chatbot**. It is a structured workflow system where an AI agent selects actions within defined constraints, and the Harness enforces those constraints.

---

# 2. Tech Stack (Decided)

**Next.js (App Router) + TypeScript**

One repo. API routes and frontend in the same project. Local dev: `npm run dev`.

```
/app
  /api
    /events/route.ts
    /webhooks/squarespace/route.ts
    /webhooks/email/route.ts
    /webhooks/scheduler/route.ts
    /cases/route.ts
    /cases/[caseId]/route.ts
    /cases/[caseId]/timeline/route.ts
    /cases/[caseId]/available-actions/route.ts
    /cases/[caseId]/drafts/route.ts
    /drafts/[draftId]/approve/route.ts
    /drafts/[draftId]/reject/route.ts
    /drafts/[draftId]/edit-and-approve/route.ts
    /health/route.ts
  /dashboard/page.tsx          ← Owner Dashboard (main UI)
  /select-time/page.tsx        ← Slot Selection Page
/lib
  /harness/
    on-event.ts                ← Execution loop entry point
    context-builder.ts
    policy.ts                  ← automation level lookup
    transitions.ts             ← state transition table
    agent.ts                   ← Claude API call
  /store/
    index.ts                   ← in-memory store (cases, drafts, timeline, interactions)
  /seed/
    index.ts                   ← 4 hardcoded cases loaded at startup
/public
  entry-form.html              ← Squarespace code block (static, self-contained)
```

**Data store:** In-memory JS objects for demo. No database setup required. Store resets on server restart — acceptable for demo.

**Agent calls:** MiniMax API (`MiniMax-M2.5`), CN 节点。API key via `MINIMAX_API_KEY` env var。使用 OpenAI SDK 兼容调用，base URL: `https://api.minimaxi.com/v1`。

---

# 3. Scope Constraints (Hard Limits)

## In scope (must implement)

- Happy path: `new_lead → intake_pending → fit_review → fit_confirmed → awaiting_client_confirmation → booked`
- Owner Dashboard: case list, case detail, timeline, draft approval, escalation notice
- Slot Selection Page: 4 time slots, select + confirm, triggers `slot_selection_received` event
- Entry Form: static HTML for Squarespace embed
- Seed data: 4 pre-built cases loaded at startup
- Trace logging → timeline entries

## Out of scope (do not implement)

- Cancellation flow implementation (state machine defines it, but no UI or Harness execution needed)
- Reschedule flow implementation (same)
- Real email sending (mock email log only)
- Real Google Calendar (hardcoded slots)
- Authentication
- Mobile layout
- Pagination / filtering on case list
- Multi-user / attribution

---

# 4. The Harness — How It Works

This is the most important part. Read carefully.

## Entry point

All system activity starts from `on_event(event)`. No other code should modify case state.

```tsx
async function on_event(event: Event): Promise<void>
```

## Execution loop (pseudocode)

```tsx
function on_event(event) {
  const case = store.loadCase(event.case_id)
  validateEventForState(event, case.state)  // throw if invalid

  // Special path: fit rejected → skip agent, direct escalate
  if (event.type === 'fit_review_completed' && event.payload.outcome === 'rejected') {
    escalateToOwner(case, 'fit_rejected')
    pauseCase(case, 'Escalated to you — the system has stepped back')
    return
  }

  const context = buildContext(case, event)
  let iterations = 0

  while (iterations < MAX_ITERATIONS) {   // MAX_ITERATIONS = 5
    iterations++
    const decision = await agent(context)  // calls Claude

    // Special path: intent classification in cancel_requested
    if (needsIntentClassification(case.state, event)) {
      handleIntentClassification(case, decision)
      break
    }

    const level = policyCheck(decision.action, case.state)
    // level = 'auto' | 'draft' | 'manual'

    if (level === 'auto') {
      const result = executeTool(decision.action, decision.params, case)
      logTrace(case, decision, result, level)
      applyTransition(case, decision.action)
      updateContext(context, result)
      if (!decision.has_more_actions) break

    } else if (level === 'draft') {
      createDraft(case, decision)
      notifyOwner(case)
      pauseCase(case, 'Waiting for your approval before the system can proceed')
      break

    } else if (level === 'manual') {
      escalateToOwner(case, decision)
      pauseCase(case, 'Escalated to you — the system has stepped back')
      break
    }
  }
}
```

## Policy check

`policyCheck(action, state)` looks up the action in the policy table and returns its automation level. If the action is not in `allowed_actions` for the current state, throw an error.

Policy table (action → level):

```tsx
const POLICY: Record<ActionType, AutomationLevel> = {
  send_intake_email:       'auto',
  request_more_info:       'draft',
  approve_fit:             'draft',
  propose_time_slots:      'auto',
  confirm_booking:         'draft',
  schedule_reminder:       'auto',
  send_cancellation_reply: 'draft',
  confirm_cancellation:    'manual',
  offer_reschedule:        'draft',
  propose_reschedule_slots:'auto',
  escalate_to_owner:       'manual',
  mark_session_completed:  'manual',
}
```

## State transitions

Transitions are driven by **completed actions**, not events directly (except for the initial `booking_inquiry_submitted → new_lead → intake_pending`).

Key happy path transitions:

```tsx
const TRANSITIONS: Record<string, Record<ActionType, BookingState>> = {
  new_lead: {
    send_intake_email: 'intake_pending'
  },
  intake_pending: {
    // transition triggered by event intake_information_completed → fit_review
    // (no action drives this directly — Harness emits internal event)
  },
  fit_review: {
    approve_fit: 'fit_confirmed',
    request_more_info: 'intake_pending'
  },
  fit_confirmed: {
    propose_time_slots: 'awaiting_client_confirmation'
  },
  awaiting_client_confirmation: {
    confirm_booking: 'booked'
  },
  booked: {
    mark_session_completed: 'completed'
  }
}
```

## Context builder (3-tier injection)

```tsx
function buildContext(case, event): string {
  // Tier 1: always full
  const tier1 = {
    case: case,  // all fields including paused_reason
    allowed_actions: ALLOWED_ACTIONS[case.state],
    policy: POLICY
  }

  // Tier 2: last 3-5 interactions in full
  const recent = store.getInteractions(case.id).slice(-5)

  // Tier 3: earlier history as summary
  const earlier = store.getInteractions(case.id).slice(0, -5)
  const summary = earlier.length > 0
    ? `${earlier.length} prior interactions. Key events: [summary]`
    : ''

  // Task
  const task = `Current event: ${event.type}. Payload: ${JSON.stringify(event.payload)}`

  return buildPrompt(tier1, recent, summary, task)
}
```

## Agent interface

Agent 使用 MiniMax-M2.5（CN 节点），通过 OpenAI SDK 兼容调用：

```tsx
// lib/harness/agent.ts
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.MINIMAX_API_KEY,
  baseURL: 'https://api.minimaxi.com/v1',
})

// 调用方式
const response = await client.chat.completions.create({
  model: 'MiniMax-M2.5',
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: contextString }
  ]
})
```

Agent 接收 context 字符串，返回结构化 JSON：

```tsx
// Standard response (agent selects action)
{ action: ActionType, params: Record<string, any>, reasoning?: string }

// Intent classification response (only in cancel_requested state)
{ intent: 'confirm_cancel' | 'reschedule' | 'unclear' }
```

System prompt 必须要求模型只返回合法 JSON，不加 markdown fences，不加前缀说明。

## Tool execution (stubbed)

```tsx
function executeTool(action, params, case): ToolResult {
  switch (action) {
    case 'send_intake_email':
      // Log to mock email store, append timeline entry
      store.logEmail({ to: case.client_email, subject: 'Tell us more', body: '...' })
      return { status: 'sent' }

    case 'propose_time_slots':
      // Return hardcoded slots from seed
      const slots = MOCK_SLOTS[case.id] || DEFAULT_SLOTS
      return { slots }

    case 'schedule_reminder':
      // Log to timeline only, no actual send
      return { scheduled: true }

    case 'escalate_to_owner':
      // Sets paused_reason, creates system_note timeline entry
      return { escalated: true }
  }
}
```

`approve_fit` and `confirm_booking` are policy=draft, so they never reach `executeTool` — they create a draft and pause instead.

---

# 5. Data Structures

```tsx
type BookingState =
  | 'new_lead' | 'intake_pending' | 'fit_review' | 'fit_confirmed'
  | 'awaiting_client_confirmation' | 'booked' | 'cancel_requested'
  | 'cancelled' | 'reschedule_requested' | 'reschedule_in_progress' | 'completed'

type AutomationLevel = 'auto' | 'draft' | 'manual'

type BookingCase = {
  id: string
  state: BookingState
  client_email: string
  client_name?: string
  source?: string
  paused_reason?: string | null  // null = system is running autonomously
  current_step?: string          // human-readable label for owner UI
  created_at: string
  updated_at: string
}

type TimelineEntry = {
  id: string
  case_id: string
  type: 'event' | 'action' | 'state_change' | 'draft' | 'system_note'
  content: string                // human-readable, no system jargon
  metadata?: {
    automation_level?: AutomationLevel
    action?: string
    from_state?: string
    to_state?: string
  }
  timestamp: string
}

type Draft = {
  id: string
  case_id: string
  action: ActionType
  status: 'pending' | 'approved' | 'rejected' | 'sent'
  channel: 'email'
  subject: string
  body: string
  created_at: string
  updated_at: string
}
```

---

# 6. API Routes

## Event ingress

```
POST /api/events
Body: { type: EventType, case_id?: string, payload: object }
Response: { accepted: boolean, event_id: string, case_id: string }

POST /api/webhooks/squarespace
Body: { email: string, name: string, message: string, is_returning?: boolean }
Response: { accepted: boolean, case_id: string }
→ Normalizes to booking_inquiry_submitted, calls on_event()

POST /api/webhooks/email
Body: { case_id: string, from: string, subject: string, body: string, received_at: string }
Response: { accepted: boolean, normalized_event_type: string, case_id: string }

POST /api/webhooks/scheduler
Body: { type: 'reminder_time_reached', case_id: string, payload: object }
Response: { accepted: boolean }
```

## Read endpoints

```
GET /api/cases
Response: { items: BookingCase[] }

GET /api/cases/:caseId
Response: BookingCase

GET /api/cases/:caseId/timeline
Response: { items: TimelineEntry[] }

GET /api/cases/:caseId/available-actions
Response: { case_id, state, actions: { action: ActionType, policy: AutomationLevel }[] }

GET /api/cases/:caseId/drafts
Response: { items: Draft[] }
```

## Owner action endpoints

```
POST /api/cases/:caseId/actions
Body: { action: ActionType, params?: object }
Response: { case_id, action, result: 'executed' | 'draft_created' | 'blocked', state }

POST /api/drafts/:draftId/approve
Body: { approved_by: string }
Response: { draft_id, status: 'sent', case_id }
→ Marks draft sent, resumes Harness (calls on_event with fit_review_completed or equivalent)

POST /api/drafts/:draftId/reject
Body: { rejected_by: string, reason?: string }
Response: { draft_id, status: 'rejected' }

POST /api/drafts/:draftId/edit-and-approve
Body: { approved_by: string, subject?: string, body: string }
Response: { draft_id, status: 'sent', case_id }
```

## Debug

```
POST /api/cases
Body: { client_email, client_name?, source? }
Response: { id, state: 'new_lead' }

GET /api/health
Response: { status: 'ok' }
```

---

# 7. Seed Data

Load these 4 cases at server startup (`/lib/seed/index.ts`). They power the demo script.

```tsx
// case_001 — Jane Kim — fit_review — PENDING DRAFT
// Used in: Demo step 1-4 (owner approves fit)
{
  id: 'case_001',
  state: 'fit_review',
  client_email: 'jane.kim@example.com',
  client_name: 'Jane Kim',
  source: 'squarespace_form',
  paused_reason: 'Waiting for your approval before the system can proceed',
  current_step: 'Ready for your review'
}
// Timeline: inquiry → AUTO send_intake_email → client replied → state_change → DRAFT pending
// Draft: approve_fit, subject: 'Next steps for your session'

// case_002 — Tom R. — cancel_requested — ESCALATED
// Used in: Demo step 7 (owner sees escalation)
{
  id: 'case_002',
  state: 'cancel_requested',
  client_email: 'tom.r@example.com',
  client_name: 'Tom R.',
  source: 'squarespace_form',
  paused_reason: 'Escalated to you — the system has stepped back',
  current_step: 'Cancellation requested'
}
// Timeline: booking confirmed → cancel requested → state_change → MANUAL system_note

// case_003 — Marcus L. — awaiting_client_confirmation — SYSTEM HANDLING
// Used in: Demo step 8 (owner sees autonomous case)
{
  id: 'case_003',
  state: 'awaiting_client_confirmation',
  client_email: 'marcus.l@example.com',
  client_name: 'Marcus L.',
  source: 'squarespace_form',
  paused_reason: null,
  current_step: 'Waiting on client'
}
// Timeline: full happy path up to slot proposal, all AUTO

// case_004 — Sarah M. — booked — COMPLETE
// Used in: Demo step 8 (contrast: fully resolved case)
{
  id: 'case_004',
  state: 'booked',
  client_email: 'sarah.m@example.com',
  client_name: 'Sarah M.',
  source: 'squarespace_form',
  paused_reason: null,
  current_step: 'Booked ✓'
}
// Timeline: full happy path including booking confirmation
```

Full timeline entries with exact content strings are in the SSOT Reference page (Section 4).

---

# 8. Owner Dashboard — Frontend Requirements

Page: `/app/dashboard/page.tsx`

## Case List (left panel, ~320px)

For each case, render:

- Client name
- State label (translated — see table below)
- Sub-label: derived from `paused_reason`
    - `null` → "System handling"
    - contains "Escalated" → "Escalated — waiting for you" + warm red dot
    - anything else → "Paused — waiting for you" + amber dot
- Last updated timestamp

State label translation:

| state | label |
| --- | --- |
| new_lead | New inquiry |
| intake_pending | Awaiting intake |
| fit_review | Ready for your review |
| fit_confirmed | Finding a time |
| awaiting_client_confirmation | Waiting on client |
| booked | Booked ✓ |
| cancel_requested | Cancellation requested |
| cancelled | Cancelled |
| reschedule_requested | Reschedule requested |
| reschedule_in_progress | Finding new time |
| completed | Completed ✓ |

## Case Detail (right panel)

Two-column layout. Left ~60% = Timeline. Right ~40% = Current state + Actions + Intervention.

**Timeline rendering:**

- `event` entries: plain text, no tag
- `action` entries: text + automation level tag (AUTO / DRAFT / MANUAL)
- `state_change` entries: lighter style, "Case moved to: [label]"
- `draft` entries: text + DRAFT tag (amber)
- `system_note` entries: text + MANUAL tag (warm red)

Tag color guide:

- AUTO: sage green background
- DRAFT: amber background
- MANUAL: warm red background

**Right column — intervention panel:**

If case has pending draft (`drafts` endpoint returns item with `status: 'pending'`):

→ Render **Draft Approval card**

- Subject + body preview
- DRAFT tag (amber)
- Buttons: Approve / Edit & Approve / Reject
- Note: "Approving will send this email and allow the system to continue."

If `paused_reason` contains "Escalated" and no pending draft:

→ Render **Escalation Notice card**

- Warm red left border
- ESCALATED tag
- Message: "The system has stepped back on this case. No draft was generated."
- Button: "I'll handle this" (clears escalation, POST /api/cases/:id/actions with action: 'escalate_acknowledged')

**API calls from dashboard:**

```
GET /api/cases                         → case list
GET /api/cases/:id                     → case detail
GET /api/cases/:id/timeline            → timeline entries
GET /api/cases/:id/available-actions   → action buttons
GET /api/cases/:id/drafts              → pending draft
POST /api/drafts/:id/approve           → approve button
POST /api/drafts/:id/edit-and-approve  → edit & approve
POST /api/drafts/:id/reject            → reject button
```

Poll interval: every 3 seconds (simple `setInterval` — no websockets needed for demo).

---

# 9. Slot Selection Page — Frontend Requirements

Page: `/app/select-time/page.tsx`

This page is reached via a link in the fit-confirmed email. For demo purposes, the link can be hardcoded to `/select-time?case_id=case_001`.

**Three states:**

1. **Default** — 4 slot cards displayed, none selected, Confirm button muted
2. **Selected** — one card highlighted (olive green border, checkmark), Confirm button active
3. **Confirmed** — cards and button hidden, message: "You're all set. A confirmation will be sent to your email shortly."

**On confirm:**

```tsx
POST /api/events
{
  type: 'slot_selection_received',
  case_id: caseId,  // from query param
  payload: {
    selection_type: 'confirmed',
    selected_slot: selectedSlot,  // e.g. 'Thu Apr 17 3:00 PM'
    received_at: new Date().toISOString()
  }
}
```

**Hardcoded slots (for demo):**

```tsx
const DEMO_SLOTS = [
  { day: 'Thursday, April 17', time: '3:00 PM', duration: '60 min' },
  { day: 'Friday, April 18',   time: '10:00 AM', duration: '60 min' },
  { day: 'Monday, April 21',   time: '2:00 PM', duration: '60 min' },
  { day: 'Tuesday, April 22',  time: '11:00 AM', duration: '60 min' },
]
```

**Also include:** "None of these work" link → POST /api/events with `selection_type: 'needs_other_options'`

---

# 10. Entry Form — Squarespace Embed

File: `/public/entry-form.html`

Self-contained HTML + CSS + JS. No external dependencies.

**Fields:** Name, Email, open textarea ("Tell me a bit about what you're looking for")

**On submit:**

```tsx
fetch('https://[YOUR_DOMAIN]/api/webhooks/squarespace', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, message })
})
```

On success: hide form, show inline message "Got it — I'll take a look and follow up shortly."

On error: show "Something went wrong. Please try again."

**Visual style (must match Homeward Breathwork site):**

- Background: transparent (inherits Squarespace page background ~#ede8de)
- Font: serif, dark (#2c2c2c)
- Input fields: minimal, underline or very light border
- Submit button: deep olive green (#2d3d2e), pill shape, white text, label "Send"
- No card container, no box shadow — form sits flush with page

---

# 11. Draft Approval → Harness Resume

This is the most important integration point. When owner approves a draft:

1. `POST /api/drafts/:draftId/approve` is called
2. Backend marks draft `status: 'sent'`
3. Backend determines what event to emit based on the draft's `action` field:

```tsx
const DRAFT_TO_RESUME_EVENT: Record<ActionType, EventType> = {
  approve_fit:      'fit_review_completed',
  confirm_booking:  'slot_selection_received',  // already confirmed
  request_more_info: 'client_message_received', // noop — just sends email
  offer_reschedule: 'reschedule_offered_and_accepted',
  send_cancellation_reply: 'client_message_received',
}
```

1. Calls `on_event()` with the resume event
2. Harness continues from where it left off
3. Case state advances, new timeline entries appear
4. Dashboard polls and reflects the change

For `approve_fit` specifically:

```tsx
// emit fit_review_completed with outcome: 'confirmed'
await on_event({
  type: 'fit_review_completed',
  case_id: draft.case_id,
  payload: { outcome: 'confirmed', completed_at: new Date().toISOString() }
})
```

This will trigger: `fit_review → fit_confirmed → propose_time_slots (auto) → awaiting_client_confirmation`

The owner will see the case advance in real time on the dashboard.

---

# 12. Demo Script (For Reference During Build)

Build to support this exact sequence:

1. Owner opens `/dashboard` — sees 4 cases. Jane Kim has amber dot.
2. Clicks Jane Kim — sees timeline, sees DRAFT pending in right column
3. Reads draft email: "Hi Jane, thanks for sharing..."
4. Clicks **Approve**
5. Dashboard updates: case moves to `fit_confirmed`, then auto-advances to `awaiting_client_confirmation`
6. Timeline shows new AUTO entry: "System sent available time slots"
7. Owner opens `/select-time?case_id=case_001` in new tab (simulates Jane)
8. Selects Thursday 3:00 PM, clicks Confirm
9. Returns to dashboard — case now shows `booked`
10. Clicks Tom R. — sees ESCALATED notice (warm red border, no email preview)
11. Clicks "I'll handle this" — escalation clears
12. Points to Marcus L. — "System handling", no action needed. Shows autonomy.

Target runtime: under 4 minutes.

---

# 14. Suggested Execution Order (Adjusted for Repo Structure)

## Current repo state

The repo currently has:

- `docs/Design/System Design/Design_SSOT.md` — authoritative system design
- `docs/Design/Interfaces/` — design prompts for all 3 interfaces
- `docs/drafts/Interfaces/` — 3 standalone Vite + React + TypeScript prototype apps (Owner_Dashboard_v2, EndUser_Interface-Entry_Form_v2, EndUser_Interface-Slot_Selection_Page_v2)
- No backend, no monorepo structure, no root package.json

## What needs to happen structurally

The 3 existing Vite prototypes are **static UI only** — they have no API connections. The task is to:

1. Create a Next.js app that contains both the API (Harness backend) and the connected frontend
2. Port or rebuild the 3 interface UIs inside the Next.js app, connecting them to live API endpoints
3. The Vite prototypes in `docs/drafts/` serve as visual reference — do not delete them

## Adjusted execution order

**Phase 1 — Scaffold the Next.js app**

- Initialize Next.js (App Router) + TypeScript at repo root or in a new `/app` directory
- Set up `/lib/store/index.ts` (in-memory store)
- Set up `/lib/seed/index.ts` (4 hardcoded cases)
- Verify: `GET /api/cases` returns seed data

**Phase 2 — All read API routes**

- `GET /api/cases`
- `GET /api/cases/[caseId]`
- `GET /api/cases/[caseId]/timeline`
- `GET /api/cases/[caseId]/available-actions`
- `GET /api/cases/[caseId]/drafts`
- Verify: all return correct seed data shapes

**Phase 3 — Owner Dashboard UI (port from Vite prototype)**

- Reference: `docs/drafts/Interfaces/Owner_Dashboard_v2/`
- Recreate in `/app/dashboard/page.tsx`, connected to Phase 2 API routes
- Case List rendering + Case Detail rendering + Timeline + Draft card + Escalation card
- Use 3-second polling interval
- Verify: dashboard renders all 4 seed cases correctly, Jane Kim shows draft, Tom R. shows escalation

**Phase 4 — Write API routes + Draft approval**

- `POST /api/events`
- `POST /api/webhooks/squarespace`
- `POST /api/cases/[caseId]/actions`
- `POST /api/drafts/[draftId]/approve`
- `POST /api/drafts/[draftId]/reject`
- `POST /api/drafts/[draftId]/edit-and-approve`
- Verify: approving Jane Kim's draft updates case state and timeline

**Phase 5 — Harness execution loop**

- `/lib/harness/on-event.ts` — happy path only
- `/lib/harness/policy.ts`, `transitions.ts`, `context-builder.ts`, `agent.ts`
- Wire `POST /api/events` and draft approval endpoints to call `on_event()`
- Verify: approving draft → Harness runs → case advances → dashboard reflects change in real time

**Phase 6 — Slot Selection Page**

- Reference: `docs/drafts/Interfaces/EndUser_Interface-Slot_Selection_Page_v2/`
- Recreate in `/app/select-time/page.tsx`
- Reads `?case_id` from query param, posts `slot_selection_received` event on confirm
- Verify: selecting a slot → `POST /api/events` → case moves to `booked` → dashboard updates

**Phase 7 — Entry Form**

- Reference: `docs/drafts/Interfaces/EndUser_Interface-Entry_Form_v2/`
- Build as `/public/entry-form.html` (self-contained HTML + CSS + JS, no React)
- Posts to `POST /api/webhooks/squarespace`
- Verify: form submit → new case created in store → visible in dashboard

**Phase 8 — Demo Script dry run**

- Walk through all 12 steps in Section 12
- Confirm under 4 minutes end-to-end

## Notes for Code Agent

- The Vite prototypes are visual reference only — extract component structure and styles, do not run them
- Do not modify anything in `docs/` — that directory is read-only design artifacts
- All implementation goes into the new Next.js app
- ANTHROPIC_API_KEY must be in `.env.local` before Phase 5 can work
- Phases 1–4 can be completed without the API key (seed data + static harness stubs sufficient)

---

# 13. Environment Setup

```bash
# .env.local
MINIMAX_API_KEY=...          # MiniMax CN 节点 API Key（从 platform.minimaxi.com 获取）
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

```bash
npm install
npm run dev
# → http://localhost:3000/dashboard
# → http://localhost:3000/select-time
```

No database setup. No external services required. All data lives in memory.