> ⚠️ This is the authoritative reference document for Zayn's build line. When in doubt about any system detail, refer here first. Do not use older Notion pages or uploaded files as the source of truth — those may be outdated.
> 

---

# How to Use This Document

This page consolidates all system contracts needed to implement the Zayn Line demo. It reflects:

- The final Harness Blueprint (with all v0.1 decisions locked)
- The corrected API Contracts (fixing gaps found in the Notion draft)
- The DB schema aligned to Pivot 2 scope
- The data types needed by the Owner Dashboard

The three documents below are **independent SSOT sections**. Each section supersedes any earlier version of that document elsewhere in Notion.

---

# Section 1 — Harness Blueprint (Final)

> Status: **Authoritative**. No changes from original SSOT. Reproduced here for single-page reference.
> 

## Design Principles

```
Agent     — reasons, selects actions within constraints, generates replies
Harness   — execution loop, context injection, state transitions, policy enforcement  
Application — defines states, events, actions, data models
```

**Core constraints:**

1. State transitions are driven by **deterministic Harness code** — never by the Agent
2. Agent may only select actions from the **allowed_actions** list for the current state
3. Any action with external side effects passes through **policy_check**
4. When uncertain: default to `create_draft + notify_owner` — never guess or self-execute
5. Any user-visible state change must have a corresponding communication (draft or auto)

---

## States (11)

| State | Meaning | Type |
| --- | --- | --- |
| `new_lead` | New inquiry just entered the system | Initial |
| `intake_pending` | Collecting / waiting for client information | Active |
| `fit_review` | Enough info gathered, evaluating practitioner-client fit | Active |
| `fit_confirmed` | Fit established, proceeding to booking | Active |
| `awaiting_client_confirmation` | Slot options sent, waiting for client to confirm | Waiting |
| `booked` | Booking confirmed (reminder scheduled) | Stable |
| `cancel_requested` | Client requested cancellation, processing | Active |
| `cancelled` | Booking cancelled | Terminal |
| `reschedule_requested` | Client requested reschedule, pending | Active |
| `reschedule_in_progress` | Sending new slot options for reschedule | Active |
| `completed` | Session completed | Terminal |

---

## Transition Table

### A. Booking Flow (Happy Path — Pivot 2 scope)

| From | Trigger | To | Notes |
| --- | --- | --- | --- |
| `new_lead` | `booking_inquiry_submitted` | `intake_pending` | action: `send_intake_email` (auto) |
| `intake_pending` | `intake_information_completed` | `fit_review` | — |
| `fit_review` | `fit_review_completed {confirmed}` | `fit_confirmed` | action: `approve_fit` (draft) |
| `fit_review` | `fit_review_completed {needs_more_info}` | `intake_pending` | action: `request_more_info` (draft) |
| `fit_review` | `fit_review_completed {rejected}` | escalated | Harness directly calls `escalate_to_owner` |
| `fit_confirmed` | `propose_time_slots` completes | `awaiting_client_confirmation` | action-driven transition |
| `awaiting_client_confirmation` | `slot_selection_received {confirmed}` | `booked` | action: `confirm_booking` (draft) |
| `awaiting_client_confirmation` | `slot_selection_received {needs_other_options}` | `awaiting_client_confirmation` | action: `propose_time_slots` (auto), stays in same state |
| `booked` | `reminder_time_reached` | `booked` | action: `schedule_reminder` (auto), **no state change** |
| `booked` | `session_marked_completed` | `completed` | action: `mark_session_completed` (manual) |

### B. Cancellation Flow (documented, not implemented in Pivot 2)

| From | Trigger | To | Notes |
| --- | --- | --- | --- |
| `awaiting_client_confirmation` | `cancel_request_received` | `cancelled` | Direct — no full cancel flow (no commitment made) |
| `booked` | `cancel_request_received` | `cancel_requested` | Enters full cancel flow |
| `cancel_requested` | `cancellation_confirmed` | `cancelled` | action: `confirm_cancellation` (manual) |
| `cancel_requested` | `reschedule_offered_and_accepted` | `reschedule_requested` | action: `offer_reschedule` (draft) |

### C. Special Paths

**`fit_review_completed {rejected}`:**

```
Harness directly triggers escalate_to_owner (bypasses Agent)
→ Case paused, owner notified
→ Owner handles client communication manually
→ Owner closes case as cancelled
```

**`cancel_requested` + `client_message_received` (structured intent):**

```
client_message_received arrives
→ Harness calls Agent for intent classification only
→ Agent returns: { "intent": "confirm_cancel" | "reschedule" | "unclear" }
→ Harness maps intent to system event
→ Normal execution continues
```

Note: This structured intent pattern is used ONLY in `cancel_requested` state.

---

## Actions (12)

| Action | Allowed States | Automation Level |
| --- | --- | --- |
| `send_intake_email` | `new_lead` | **auto** |
| `request_more_info` | `intake_pending`, `fit_review`, `reschedule_in_progress` | **draft** |
| `approve_fit` | `fit_review` | **draft** |
| `propose_time_slots` | `fit_confirmed`, `awaiting_client_confirmation` | **auto** |
| `confirm_booking` | `awaiting_client_confirmation`, `reschedule_in_progress` | **draft** |
| `schedule_reminder` | `booked` | **auto** (no state change) |
| `send_cancellation_reply` | `cancel_requested` | **draft** |
| `confirm_cancellation` | `cancel_requested` | **manual** |
| `offer_reschedule` | `cancel_requested`, `reschedule_requested` | **draft** |
| `propose_reschedule_slots` | `reschedule_requested`, `reschedule_in_progress` | **auto** |
| `escalate_to_owner` | `intake_pending`, `fit_review`, `awaiting_client_confirmation`, `cancel_requested`, `reschedule_requested`, `reschedule_in_progress` | **manual** |
| `mark_session_completed` | `booked` | **manual** |

---

## Automation Levels

| Level | Meaning | Owner action required |
| --- | --- | --- |
| **auto** | System executes directly, logs to timeline | None — visible in timeline only |
| **draft** | System generates draft, owner approves before sending | View → Edit (optional) → Approve / Reject |
| **manual** | System does not execute, owner takes full control | Owner decides and acts |

---

## Harness Execution Loop

```tsx
function on_event(event: Event): void {
  const case = load_case(event.case_id)
  validate_event_for_state(event, case.state)

  // Special path: rejected fit → direct escalate, skip Agent
  if (event.type === "fit_review_completed" && event.outcome === "rejected") {
    escalate_to_owner(case, reason: "fit_rejected")
    pause_case(case)
    return
  }

  const context = build_context(case, event)

  let iterations = 0
  while (iterations < MAX_ITERATIONS) {
    iterations++
    const decision = agent(context)

    // Special path: intent classification in cancel_requested
    if (is_intent_classification_needed(case.state, event)) {
      handle_intent_classification(case, decision.intent)
      break
    }

    const policy_result = policy_check(decision.action, case.state)

    if (policy_result === "auto") {
      const result = execute_tool(decision.action, decision.params)
      log_trace(case, decision, result, policy_result)
      apply_transition(case, decision.action)
      update_context(context, result)
      if (!has_more_actions(decision)) break

    } else if (policy_result === "draft") {
      create_draft(case, decision)
      notify_owner(case)
      pause_case(case)
      break

    } else if (policy_result === "manual") {
      escalate_to_owner(case, decision)
      pause_case(case)
      break
    }
  }
}
```

## Context Builder (3-tier)

```
Tier 1 — Always injected in full:
  All BookingCase fields (state, client info, policy_ref, timestamps)
  Current state's allowed_actions list
  Relevant PolicyConfig rules

Tier 2 — Recent messages in full:
  Last 3–5 Interactions with full content

Tier 3 — Earlier history compressed:
  "N prior interactions. Key events: ..."

Task:
  Description of the current event to handle
```

Never compress: BookingCase structured fields, active policy constraints, any in-flight actions.

---

## Trace Log Schema

```tsx
CaseTrace {
  case_id: string
  iteration: number
  timestamp: string
  context_snapshot: {
    case_state: string
    allowed_actions: string[]
    messages_in_context: number
    tokens_used: number
  }
  agent_decision: {
    action_selected: string
    params: Record<string, any>
    reasoning_summary?: string
  }
  harness_execution: {
    pre_hook_result: "allow" | "block" | "draft" | "manual"
    automation_level: "auto" | "draft" | "manual"
    tool_called?: string
    tool_result?: string
    state_transition?: { from: string, to: string }
  }
  outcome: string
  duration_ms: number
}
```

---

# Section 2 — API Contracts (Corrected)

> Status: **Authoritative**. This corrects the Notion draft (Issue Layer 1 - API Contracts) which was missing webhook endpoints, draft endpoints, and had inconsistent naming. Use this version.
> 

## Design Principles

1. **Event-first** — all external triggers enter via events. UI never directly mutates case state.
2. **Read / Act separation** — read endpoints for views; act endpoints for events and owner actions.
3. **Harness controls state** — no public API may directly set `case.state` or transition history.
4. **Draft / manual control are first-class** — owner approval endpoints are part of the core API.

---

## Domain Types

```tsx
type BookingState =
  | "new_lead" | "intake_pending" | "fit_review" | "fit_confirmed"
  | "awaiting_client_confirmation" | "booked" | "cancel_requested"
  | "cancelled" | "reschedule_requested" | "reschedule_in_progress" | "completed"

type EventType =
  | "booking_inquiry_submitted" | "client_message_received"
  | "slot_selection_received" | "cancel_request_received"
  | "reschedule_request_received" | "reschedule_slot_selection_received"
  | "intake_information_completed" | "fit_review_completed"
  | "reminder_time_reached" | "session_marked_completed"

type ActionType =
  | "send_intake_email" | "request_more_info" | "approve_fit"
  | "propose_time_slots" | "confirm_booking" | "schedule_reminder"
  | "send_cancellation_reply" | "confirm_cancellation" | "offer_reschedule"
  | "propose_reschedule_slots" | "escalate_to_owner" | "mark_session_completed"

type AutomationLevel = "auto" | "draft" | "manual"
```

---

## Resource Schemas

```tsx
type BookingCase = {
  id: string
  state: BookingState
  client_email: string
  client_name?: string
  source?: "squarespace_form" | "web_form" | "email"
  is_returning_hint?: boolean
  created_at: string
  updated_at: string
  current_step?: string
  paused_reason?: string | null  // ← critical for Owner Dashboard display
}

type TimelineEntry = {
  id: string
  timestamp: string
  type: "event" | "action" | "state_change" | "draft" | "system_note"  // ← 5 types
  content: string
  metadata?: Record<string, any>  // includes automation_level for action entries
}

type Draft = {
  id: string
  case_id: string
  action: ActionType
  status: "pending" | "approved" | "rejected" | "sent"
  channel?: "email"
  subject?: string
  body?: string
  created_at: string
  updated_at: string
}

type AvailableAction = {
  action: ActionType
  policy: AutomationLevel
}
```

---

## API Surface

### Event Ingress

**POST /events** — canonical event ingress, all system triggers

```tsx
// Request
{ type: EventType, case_id?: string, payload: Record<string, any> }
// Response
{ accepted: boolean, event_id: string, case_id: string, status: "queued" }
// Note: case_id is optional only for booking_inquiry_submitted; required for all others
```

**POST /webhooks/squarespace** — normalizes Squarespace form submission

```tsx
// Request
{ email: string, name: string, message: string, is_returning?: boolean }
// Internally maps to booking_inquiry_submitted event
// Response
{ accepted: boolean, case_id: string }
```

**POST /webhooks/email** — mock/real inbound email ingress

```tsx
// Request
{ case_id: string, from: string, subject: string, body: string, received_at: string }
// Normalizes to: client_message_received | cancel_request_received |
//   reschedule_request_received | slot_selection_received | reschedule_slot_selection_received
// Response
{ accepted: boolean, normalized_event_type: string, case_id: string }
```

**POST /webhooks/scheduler** — time-based event ingress (reminders)

```tsx
// Request
{ type: "reminder_time_reached", case_id: string, payload: { scheduled_for, triggered_at } }
// Response
{ accepted: boolean, event_id: string, case_id: string }
```

---

### Read Endpoints

**GET /cases** — case list for Owner Dashboard

```tsx
// Query: state? (filter), limit?, cursor?
// Response: { items: BookingCase[], next_cursor: null }
```

**GET /cases/:caseId** — single case read model

```tsx
// Response: BookingCase (full, including paused_reason)
```

**GET /cases/:caseId/timeline** — timeline for Owner Dashboard

```tsx
// Response: { items: TimelineEntry[] }
// Note: type field uses all 5 values: event | action | state_change | draft | system_note
// action entries include metadata.automation_level: "auto" | "draft" | "manual"
```

**GET /cases/:caseId/available-actions** — policy-filtered actions

```tsx
// Response: { case_id, state, actions: AvailableAction[] }
// Note: endpoint path is /available-actions (not /actions — fixes naming inconsistency)
```

**GET /cases/:caseId/drafts** — pending and historical drafts

```tsx
// Response: { items: Draft[] }
```

---

### Owner Action Endpoints

**POST /cases/:caseId/actions** — manual action execution or owner override

```tsx
// Request: { action: ActionType, params?: Record<string, any> }
// Response: { case_id, action, result: "executed" | "draft_created" | "blocked", state }
// Rule: draft-policy actions create a draft rather than bypassing policy
```

**POST /drafts/:draftId/approve**

```tsx
// Request: { approved_by: string }
// Response: { draft_id, status: "sent", case_id }
```

**POST /drafts/:draftId/reject**

```tsx
// Request: { rejected_by: string, reason?: string }
// Response: { draft_id, status: "rejected" }
```

**POST /drafts/:draftId/edit-and-approve**

```tsx
// Request: { approved_by: string, subject?: string, body: string }
// Response: { draft_id, status: "sent", case_id }
```

---

### Debug / Demo Endpoints

**POST /cases** — direct case creation for seed data / demo init

```tsx
// Request: { client_email, client_name?, source? }
// Response: { id, state: "new_lead" }
```

**GET /health**

```tsx
// Response: { status: "ok" }
```

---

## System Flow

```
POST /webhooks/squarespace  (or /events directly)
   ↓
Event normalization
   ↓
Harness: on_event()
   ↓
Agent → action decision
   ↓
policy_check(action, state)
   ↓
auto → execute + log + transition
draft → create_draft + notify_owner + pause_case
manual → escalate_to_owner + pause_case
   ↓
Timeline appended
   ↓
Owner Dashboard reads via GET endpoints
```

---

## Key Fixes vs. Notion Draft (Issue Layer 1)

| Issue | Notion draft | This document (correct) |
| --- | --- | --- |
| Webhook endpoints | Missing | POST /webhooks/squarespace, /email, /scheduler |
| Draft endpoints | Missing | GET /drafts, POST /drafts/:id/approve, /reject, /edit-and-approve |
| Available actions path | `/cases/:id/actions` | `/cases/:caseId/available-actions` |
| Timeline entry types | 3 types only | 5 types: + `draft`  • `system_note` |
| BookingCase fields | 4 fields | Full schema including `paused_reason`, `current_step` |

---

# Section 3 — DB Schema (Pivot 2 Scope)

> Status: **Authoritative for Pivot 2**. Lightweight — in-memory or SQLite. No production DB needed.
> 

```tsx
// BookingCase
{
  id: string                    // case_001, case_002, etc.
  state: BookingState
  client_email: string
  client_name?: string
  source?: "squarespace_form" | "web_form" | "email"
  is_returning_hint?: boolean
  paused_reason?: string | null  // shown in Owner Dashboard right column
  current_step?: string          // human-readable step label
  created_at: string
  updated_at: string
}

// TimelineEntry
{
  id: string
  case_id: string
  type: "event" | "action" | "state_change" | "draft" | "system_note"
  content: string                // human-readable, no system jargon
  metadata?: {
    automation_level?: "auto" | "draft" | "manual"  // for action entries
    action?: string              // action name if type=action
    from_state?: string          // for state_change entries
    to_state?: string
  }
  timestamp: string
}

// Draft
{
  id: string
  case_id: string
  action: ActionType
  status: "pending" | "approved" | "rejected" | "sent"
  channel: "email"
  subject: string
  body: string
  created_at: string
  updated_at: string
}

// Interaction
{
  id: string
  case_id: string
  channel: "email" | "web_form" | "admin_note"
  direction: "inbound" | "outbound" | "internal"
  content: string
  timestamp: string
}

// MockEmailLog (replaces real email sending)
{
  id: string
  case_id: string
  to: string
  subject: string
  body: string
  sent_at: string
  source_action: ActionType
}
```

---

# Section 4 — Seed Data (Pivot 2 Demo)

> These are the 4 pre-built cases that power the demo script. Hardcode these at startup.
> 

## case_001 — Jane Kim — `fit_review` — Pending Draft

```tsx
BookingCase: {
  id: "case_001",
  state: "fit_review",
  client_email: "jane.kim@example.com",
  client_name: "Jane Kim",
  source: "squarespace_form",
  paused_reason: "Waiting for your approval before the system can proceed",
  current_step: "Ready for your review"
}

Timeline: [
  { type: "event", content: "Booking inquiry received via Squarespace form", timestamp: "Apr 5, 9:30 AM" },
  { type: "action", content: "System sent intake email", metadata: { automation_level: "auto", action: "send_intake_email" }, timestamp: "Apr 5, 9:31 AM" },
  { type: "event", content: "Jane replied with intake information", timestamp: "Apr 5, 2:14 PM" },
  { type: "state_change", content: "Case moved to: Ready for your review", metadata: { from_state: "intake_pending", to_state: "fit_review" }, timestamp: "Apr 5, 2:15 PM" },
  { type: "draft", content: "Draft ready — waiting for your approval", metadata: { automation_level: "draft", action: "approve_fit" }, timestamp: "Apr 5, 2:16 PM" }
]

Draft: {
  id: "draft_001",
  case_id: "case_001",
  action: "approve_fit",
  status: "pending",
  channel: "email",
  subject: "Next steps for your session",
  body: "Hi Jane, thanks for sharing more about what you're looking for. Based on what you've shared, I think this could be a great fit. I'd love to find a time to connect — I'll send over a few options shortly."
}
```

## case_002 — Tom R. — `cancel_requested` — Escalation

```tsx
BookingCase: {
  id: "case_002",
  state: "cancel_requested",
  client_email: "tom.r@example.com",
  client_name: "Tom R.",
  source: "squarespace_form",
  paused_reason: "Escalated to you — the system has stepped back",
  current_step: "Cancellation requested"
}

Timeline: [
  { type: "event", content: "Booking confirmed", timestamp: "Apr 9, 8:00 AM" },
  { type: "state_change", content: "Case moved to: Booked", metadata: { from_state: "awaiting_client_confirmation", to_state: "booked" }, timestamp: "Apr 9, 8:01 AM" },
  { type: "event", content: "Tom requested cancellation", timestamp: "Apr 9, 11:42 AM" },
  { type: "state_change", content: "Case moved to: Cancellation requested", metadata: { from_state: "booked", to_state: "cancel_requested" }, timestamp: "Apr 9, 11:43 AM" },
  { type: "system_note", content: "System escalated to you — no draft generated", metadata: { automation_level: "manual" }, timestamp: "Apr 9, 11:43 AM" }
]
```

## case_003 — Marcus L. — `awaiting_client_confirmation` — System Handling

```tsx
BookingCase: {
  id: "case_003",
  state: "awaiting_client_confirmation",
  client_email: "marcus.l@example.com",
  client_name: "Marcus L.",
  source: "squarespace_form",
  paused_reason: null,
  current_step: "Waiting on client"
}

Timeline: [
  { type: "event", content: "Booking inquiry received via Squarespace form", timestamp: "Apr 7, 10:00 AM" },
  { type: "action", content: "System sent intake email", metadata: { automation_level: "auto" }, timestamp: "Apr 7, 10:01 AM" },
  { type: "event", content: "Marcus replied with intake information", timestamp: "Apr 7, 3:30 PM" },
  { type: "state_change", content: "Case moved to: Ready for your review", metadata: { from_state: "intake_pending", to_state: "fit_review" }, timestamp: "Apr 7, 3:31 PM" },
  { type: "action", content: "Draft approved — fit confirmation email sent", metadata: { automation_level: "draft" }, timestamp: "Apr 8, 9:00 AM" },
  { type: "state_change", content: "Case moved to: Finding a time", metadata: { from_state: "fit_review", to_state: "fit_confirmed" }, timestamp: "Apr 8, 9:01 AM" },
  { type: "action", content: "System sent available time slots", metadata: { automation_level: "auto" }, timestamp: "Apr 8, 9:02 AM" },
  { type: "state_change", content: "Case moved to: Waiting on client", metadata: { from_state: "fit_confirmed", to_state: "awaiting_client_confirmation" }, timestamp: "Apr 8, 9:02 AM" }
]
```

## case_004 — Sarah M. — `booked` — Complete, No Action

```tsx
BookingCase: {
  id: "case_004",
  state: "booked",
  client_email: "sarah.m@example.com",
  client_name: "Sarah M.",
  source: "squarespace_form",
  paused_reason: null,
  current_step: "Booked ✓"
}

Timeline: [
  { type: "event", content: "Booking inquiry received via Squarespace form", timestamp: "Apr 3, 11:00 AM" },
  { type: "action", content: "System sent intake email", metadata: { automation_level: "auto" }, timestamp: "Apr 3, 11:01 AM" },
  { type: "state_change", content: "Case moved to: Ready for your review", metadata: { from_state: "intake_pending", to_state: "fit_review" }, timestamp: "Apr 4, 2:00 PM" },
  { type: "action", content: "Draft approved — fit confirmation email sent", metadata: { automation_level: "draft" }, timestamp: "Apr 4, 4:00 PM" },
  { type: "action", content: "System sent available time slots", metadata: { automation_level: "auto" }, timestamp: "Apr 4, 4:01 PM" },
  { type: "event", content: "Sarah confirmed Thursday, April 10 at 3:00 PM", timestamp: "Apr 4, 6:30 PM" },
  { type: "action", content: "Draft approved — booking confirmation email sent", metadata: { automation_level: "draft" }, timestamp: "Apr 5, 9:00 AM" },
  { type: "state_change", content: "Case moved to: Booked", metadata: { from_state: "awaiting_client_confirmation", to_state: "booked" }, timestamp: "Apr 5, 9:00 AM" },
  { type: "action", content: "Reminder scheduled for Apr 9 at 3:00 PM", metadata: { automation_level: "auto" }, timestamp: "Apr 5, 9:01 AM" }
]
```

---

# Section 5 — Owner Dashboard: State Label Map

> Used by the frontend to translate system state names into human-readable labels.
> 

| System State | Owner-facing label | Sub-label |
| --- | --- | --- |
| `new_lead` | New inquiry | System handling |
| `intake_pending` | Awaiting intake | System handling |
| `fit_review` (draft pending) | Ready for your review | Paused — waiting for you |
| `fit_confirmed` | Finding a time | System handling |
| `awaiting_client_confirmation` | Waiting on client | System handling |
| `booked` | Booked ✓ | System handling |
| `cancel_requested` (escalated) | Cancellation requested | Escalated — waiting for you |
| `cancel_requested` (draft pending) | Cancellation requested | Paused — waiting for you |
| `cancelled` | Cancelled | — |
| `reschedule_requested` | Reschedule requested | System handling |
| `reschedule_in_progress` | Finding new time | System handling |
| `completed` | Completed ✓ | — |

> Rule: sub-label is determined by `paused_reason` field. If `paused_reason` is null → "System handling". If contains "escalated" → "Escalated — waiting for you". Otherwise → "Paused — waiting for you".
>