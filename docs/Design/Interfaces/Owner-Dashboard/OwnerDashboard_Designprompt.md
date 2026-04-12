Design a desktop owner dashboard for a wellness booking management system called Tend. This is a trust control interface — not a metrics dashboard. The owner (a solo wellness practitioner) uses this to understand what the system is doing, what needs her attention, and to approve, reject, or take over when needed.

The Harness layer (the system's execution engine) controls all state transitions and action execution. The dashboard is the owner's window into that engine. Every element must reflect what the Harness actually produces: state, automation level, paused status, draft content, and escalation notices.

---

VISUAL DIRECTION

- Background: warm off-white (#faf8f5), full page
- Left sidebar / case list panel: slightly darker warm tone (#f0ece5), subtle right border (#e8e2d9)
- Cards / panels: soft white (#ffffff) with very light border (#e8e2d9) and minimal shadow
- Liquid Glass: applied only to the active case highlight card in Case Detail right column — soft translucency, subtle backdrop blur. Nowhere else.
- Typography: clean sans-serif throughout
- Accent color: deep olive green (#2d3d2e) — primary CTAs, active states, selected case indicator only
- Muted text: warm gray (#9e9890) — timestamps, secondary labels, paused reason text
- Intervention indicator: small amber dot (#c9872a) — used only where owner action is required (pending draft or escalation)
- Escalation indicator: small warm red dot (#b85c4a) — used only for escalation notices (higher urgency than draft)
- AUTO tag: soft sage green background, dark text
- DRAFT tag: soft amber background, dark text
- MANUAL / ESCALATED tag: soft warm red background, dark text

---

LAYOUT

Two-panel desktop layout:
- Left panel: Case List (~320px fixed, scrollable)
- Right panel: Case Detail (fills remaining width)
- No top navigation bar

---

FRAME 1 — Case List Panel

Show 4 cases. Cases needing owner action appear first.

Case 1 — Jane Kim
- State label: "Ready for your review"
- Sub-label (muted, small): "Paused — waiting for you"
- Last updated: "2 hours ago"
- Indicator: amber dot (pending draft)
- Selected / active state: olive green left border, slightly lighter background

Case 2 — Tom R.
- State label: "Cancellation requested"
- Sub-label (muted, small): "Escalated — waiting for you"
- Last updated: "Just now"
- Indicator: warm red dot (escalation, higher urgency)

Case 3 — Marcus L.
- State label: "Waiting on client"
- Sub-label (muted, small): "System handling"
- Last updated: "Yesterday"
- No indicator dot

Case 4 — Sarah M.
- State label: "Booked ✓"
- Sub-label (muted, small): "System handling"
- Last updated: "3 days ago"
- No indicator dot

KEY DESIGN REQUIREMENT:
The sub-label is critical. "Paused — waiting for you" = owner must act. "System handling" = no action needed. This distinction must be immediately readable without relying on the indicator dot alone.

---

FRAME 2 — Case Detail (Jane Kim — Draft Approval scenario)

Jane Kim is selected. Right panel opens. Two-column layout inside the right panel.

--- LEFT COLUMN (~60%): Timeline ---

Header: "Activity"

Timeline entries (chronological, oldest first):

1. [Apr 5, 9:30 AM] — Event
   "Booking inquiry received via Squarespace form"
   No tag

2. [Apr 5, 9:31 AM] — Action
   "System sent intake email"
   Tag: AUTO (sage green)

3. [Apr 5, 2:14 PM] — Event
   "Jane replied with intake information"
   No tag

4. [Apr 5, 2:15 PM] — State change
   "Case moved to: Ready for your review"
   Slightly different visual treatment — subtle background or horizontal rule

5. [Apr 5, 2:16 PM] — Draft created
   "Draft ready — waiting for your approval"
   Tag: DRAFT (amber)
   This entry is the most recent and should feel visually prominent

Each entry: timestamp (muted), description, tag (if applicable).
State change entries use a lighter, indented style to distinguish them from action entries.

--- RIGHT COLUMN (~40%): Current State + Actions + Draft ---

TOP SECTION — Case status
- Client: "Jane Kim" (medium weight)
- Email: "jane@example.com" (muted)
- Current state: "Ready for your review" (olive green label or badge)
- Paused reason (muted italic): "Waiting for your approval before the system can proceed"

MIDDLE SECTION — Available actions
Three buttons, each with a policy tag:

"Approve Fit" — primary, olive green pill — [DRAFT]
"Request More Info" — secondary outline — [DRAFT]
"Escalate to Owner" — ghost/muted — [MANUAL]

Small label above the button group (muted, uppercase): "AVAILABLE ACTIONS"

BOTTOM SECTION — Pending Draft (expanded inline)

This is a DRAFT scenario (system generated an email, owner must approve it).

Draft card with slightly elevated shadow:

Label (small, amber tag): "DRAFT — Approve Fit"
Channel: "Email to jane@example.com"
Subject: "Next steps for your session"
Body:
"Hi Jane, thanks for sharing more about what you're looking for. Based on what you've shared, I think this could be a great fit. I'd love to find a time to connect — I'll send over a few options shortly."

Three action buttons below the body:
- "Approve" — solid olive green, pill
- "Edit & Approve" — outline olive green, pill
- "Reject" — ghost, muted warm gray, no red color

Small note below buttons (muted): "Approving will send this email and allow the system to continue."

---

FRAME 3 — Case Detail (Tom R. — Escalation scenario)

Tom R. is selected (the escalation case). This frame shows what an ESCALATION looks like — which is different from a draft approval.

In an escalation, the system has paused and is NOT offering a draft email. It has handed full control to the owner.

LEFT COLUMN: Timeline

1. [Apr 9, 8:00 AM] — Event
   "Booking confirmed"
   No tag

2. [Apr 9, 11:42 AM] — Event
   "Tom requested cancellation"
   No tag

3. [Apr 9, 11:43 AM] — State change
   "Case moved to: Cancellation requested"

4. [Apr 9, 11:43 AM] — System note
   "System escalated to you — no draft generated"
   Tag: MANUAL (warm red)
   This is NOT a draft entry. It is a system_note type. Different visual style from the DRAFT entry in Frame 2.

RIGHT COLUMN:

TOP SECTION:
- Client: "Tom R."
- Email: "tom@example.com" (muted)
- Current state: "Cancellation requested" (warm red label or badge)
- Paused reason (muted italic): "Escalated to you — the system has stepped back"

MIDDLE SECTION — Available actions:

"Send Cancellation Reply" — primary, olive green — [DRAFT]
"Confirm Cancellation" — secondary outline — [MANUAL]
"Offer to Reschedule" — secondary outline — [DRAFT]
"Escalate Further" — ghost/muted — [MANUAL]

BOTTOM SECTION — Escalation Notice (NOT a draft card):

Notice card with warm red left border accent:

Label (small, warm red tag): "ESCALATED"
Message:
"The system has stepped back on this case. No draft was generated. Tom has requested a cancellation — how you handle this conversation is up to you."

Single action button:
- "I'll handle this" — outline olive green, pill
  (This is not a submit action — it just acknowledges and clears the escalation notice)

Small note below (muted): "The system will wait until you manually update this case."

---

CONSTRAINTS
- No modal dialogs — everything inline
- No client photos or avatars
- No charts, graphs, or analytics
- All state labels must use human-readable language — never expose system state names like "fit_review" or "cancel_requested"
- The distinction between DRAFT (system generated something, owner approves) and ESCALATED (system stepped back, owner takes over) must be visually unambiguous
- AUTO / DRAFT / MANUAL tags must appear consistently on both timeline entries and action buttons
- "Paused — waiting for you" vs "System handling" sub-labels in Case List must be immediately readable
- Desktop only — no mobile layout