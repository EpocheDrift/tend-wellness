> This document is written for a Code Agent. Read it fully before writing any code. It covers everything needed to implement the Mock Inbox page and Reply feature as part of the Tend demo packaging.
> 

---

# Context

The Tend system sends emails via a mock email store (in-memory). During demo, customers cannot see these emails — the email thread is invisible. This feature adds a `/inbox` page that surfaces those emails and allows simulating a client reply to the intake email, eliminating the need for curl commands during demo.

**This is a patch on top of the existing system. No existing files should be modified except to add the new API endpoint to the store.**

---

# Scope

## In scope

- `/app/inbox/page.tsx` — inbox UI page
- `/app/api/inbox/route.ts` — reads mock email store, returns emails grouped by case
- Reply modal on intake emails → triggers `intake_information_completed` event
- Visual style consistent with existing dashboard (warm off-white, olive green accents)

## Out of scope

- Real email sending
- Authentication
- Pagination
- Email compose (only reply to intake)
- Mobile layout

---

# Existing System Context

## Mock email store

The existing mock email store is in `/lib/store/index.ts`. Emails are logged there by the Harness tool execution layer when `send_intake_email` or other email actions fire. The store already contains a `MockEmailLog` structure:

```tsx
type MockEmailLog = {
  id: string
  case_id: string
  to: string
  subject: string
  body: string
  sent_at: string
  source_action: ActionType
}
```

The store should already have a `getEmails()` or equivalent method. If not, add one — it should return all `MockEmailLog` entries.

## Seed data emails

The 4 seed cases already have timeline entries representing sent emails. On startup, the mock email store should be pre-populated with matching email entries for each seed case so `/inbox` is not empty when the demo starts. If seed data does not currently populate the mock email store, add that to `/lib/seed/index.ts`.

Minimum seed emails to add:

| case_id | source_action | subject |
| --- | --- | --- |
| case_001 | `send_intake_email` | Tell us about yourself |
| case_001 | `approve_fit` | Next steps for your session |
| case_003 | `send_intake_email` | Tell us about yourself |
| case_003 | `approve_fit` | Next steps for your session — Marcus |
| case_004 | `send_intake_email` | Tell us about yourself |
| case_004 | `approve_fit` | Next steps for your session — Sarah |
| case_004 | `confirm_booking` | Your session is confirmed |

---

# New API Endpoint

## `GET /api/inbox`

Returns all emails from the mock email store, grouped by `case_id`, with client name resolved from the case store.

**Response shape:**

```tsx
type InboxResponse = {
  groups: InboxGroup[]
}

type InboxGroup = {
  case_id: string
  client_name: string
  client_email: string
  emails: InboxEmail[]
}

type InboxEmail = {
  id: string
  case_id: string
  to: string
  subject: string
  body: string
  sent_at: string
  source_action: ActionType
  is_intake: boolean  // true if source_action === 'send_intake_email'
  can_reply: boolean  // true if is_intake AND case is still in intake_pending state
}
```

**Logic:**

1. Load all emails from mock email store
2. For each email, load the associated case to resolve `client_name`, `client_email`, and current `state`
3. Set `is_intake = source_action === 'send_intake_email'`
4. Set `can_reply = is_intake && case.state === 'intake_pending'`
5. Group emails by `case_id`, sort groups by most recent email first
6. Within each group, sort emails by `sent_at` ascending (chronological)

**File:** `/app/api/inbox/route.ts`

---

# Inbox UI Page

**File:** `/app/inbox/page.tsx`

## Layout

Two-column desktop layout, consistent with the dashboard:

```
[ Left panel — Email list (~320px) ]  [ Right panel — Email detail ]
  case_001 · Jane Kim                   Subject
    ↳ Tell us about yourself             Body (full)
    ↳ Next steps for your session        [Reply button — if can_reply]
  case_003 · Marcus L.
    ↳ ...
```

## Left panel — Email list

Grouped by client. Each group shows:

- Client name (header, medium weight)
- List of emails under that client: subject line + timestamp (muted)
- Clicking an email opens it in the right panel
- Active email has olive green left border

## Right panel — Email detail

When an email is selected:

- **To:** `{email.to}` (muted)
- **Subject:** `{email.subject}` (medium weight)
- **Sent:** `{email.sent_at}` formatted as readable date/time (muted)
- **Body:** full email body, rendered as plain text with line breaks preserved
- **Action badge:** small tag showing `source_action` translated to human label (see table below)
- **Reply button:** shown only if `email.can_reply === true` (see Reply Modal section)

### Source action label translation

| source_action | Display label |
| --- | --- |
| `send_intake_email` | Intake |
| `approve_fit` | Fit Confirmation |
| `confirm_booking` | Booking Confirmation |
| `request_more_info` | Follow-up |
| `send_cancellation_reply` | Cancellation |
| `offer_reschedule` | Reschedule Offer |
| `schedule_reminder` | Reminder |

## Empty state

If no emails exist (fresh server start before any entry form submission): show centered muted text: "No emails yet. Submit a booking inquiry to get started."

## Polling

Same as dashboard: poll `GET /api/inbox` every 3 seconds via `setInterval`. This ensures new emails appear in real time after the owner approves a draft.

---

# Reply Modal

The Reply button appears on intake emails where `can_reply === true`. It simulates the client replying to the intake email with their information.

## Trigger

Button label: **"Simulate Client Reply"**

Style: outline olive green pill, same as secondary action buttons in dashboard

## Modal content

Simple modal overlay, centered on screen:

**Title:** "Simulate client reply"

**Subtitle (muted):** "This simulates the client filling out their intake information."

**Form fields:**

| Field | Label | Type | Required |
| --- | --- | --- | --- |
| `primary_concern` | What brings you here? | textarea (3 rows) | Yes |
| `goals` | What are you hoping to work on? | textarea (2 rows) | Yes |

Pre-filled defaults (to speed up demo):

- primary_concern: `"Work stress and anxiety"`
- goals: `"Build coping strategies and find more balance"`

**Buttons:**

- **Send Reply** — primary, olive green pill
- **Cancel** — ghost/muted

## On submit

```tsx
// POST to /api/events
{
  type: 'intake_information_completed',
  case_id: email.case_id,
  payload: {
    responses: {
      primary_concern: formData.primary_concern,
      goals: formData.goals
    }
  }
}
```

On success:

- Close modal
- Show brief inline confirmation on the email detail: "Reply sent — case advancing to fit review."
- The email's `can_reply` will become `false` on next poll (case state has advanced past `intake_pending`)

On error:

- Show error message inside modal: "Something went wrong. Try again."
- Keep modal open

---

# Visual Style

Consistent with the existing Owner Dashboard. Do not introduce new design tokens.

- **Background:** warm off-white (`#faf8f5`)
- **Left panel background:** slightly darker (`#f0ece5`), subtle right border
- **Active email / selected state:** olive green left border (`#2d3d2e`)
- **Primary button:** olive green pill (`#2d3d2e`), white text
- **Muted text:** warm gray (`#9e9890`)
- **Body text:** dark (`#2c2c2c`)
- **Modal overlay:** semi-transparent dark background
- **Modal card:** white, rounded corners, subtle shadow

---

# Navigation

Add `/inbox` to the navigation so it's accessible from the dashboard. The dashboard currently has no nav bar — add a minimal top nav to both `/dashboard` and `/inbox` with two links:

```
[ Tend ]    Dashboard    Inbox
```

Active link: olive green, bold. Inactive: muted gray.

This is the only navigation change needed. No other pages require nav updates.

---

# Docker: No Changes Needed

The inbox page is a standard Next.js page in the same app. It will be included automatically in `npm run build` and the existing Dockerfile requires no modifications.

One thing to verify before building the Docker image: make sure `NEXT_PUBLIC_API_BASE_URL` in the app code uses **relative paths** (`/api/...`) rather than absolute URLs (`http://localhost:3000/api/...`). If the frontend currently uses absolute URLs, update all fetch calls to use relative paths. This ensures the Docker image works on any domain without rebuild.

---

# File Summary

| File | Action | Notes |
| --- | --- | --- |
| `/app/inbox/page.tsx` | Create | Inbox UI, polling, reply modal |
| `/app/api/inbox/route.ts` | Create | Reads mock email store, groups by case |
| `/lib/store/index.ts` | Possibly extend | Add `getEmails()` if not present |
| `/lib/seed/index.ts` | Extend | Pre-populate mock email store for seed cases |
| `/app/dashboard/page.tsx` | Minor update | Add top nav with Dashboard + Inbox links |
| `/app/inbox/page.tsx` | — | Also includes the top nav |

No changes to Harness, API routes, or any other existing files.

---

# Demo Flow This Enables

With this feature, the full demo flow with no curl commands:

1. Open `/entry-form.html` → submit inquiry → case appears in dashboard
2. Open `/inbox` → see intake email that system sent (AUTO)
3. Click intake email → click **"Simulate Client Reply"** → fill form → Send Reply
4. Switch to `/dashboard` → case now at `fit_review`, draft ready
5. Approve draft → case auto-advances to `awaiting_client_confirmation`
6. Open `/select-time?caseId=<id>` → select slot → confirm
7. Back to `/dashboard` → approve `confirm_booking` draft → **booked ✓**
8. Open `/inbox` → see booking confirmation email the system sent