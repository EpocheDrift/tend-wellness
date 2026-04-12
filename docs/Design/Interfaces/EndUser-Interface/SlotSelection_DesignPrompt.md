Design a standalone, minimal web page for selecting a session time. This is the only moment in a wellness booking flow where the user makes a decision — it should feel calm, clear, and complete in itself.

This page is reached via a link in an email. It has no navigation, no header, no footer. Single purpose: pick a time, confirm, done.

---

VISUAL DIRECTION
- Background: soft warm white (#faf8f5), full page
- Liquid Glass aesthetic — applied selectively and with restraint:
  - Time slot cards: soft translucent card with very subtle backdrop blur, light border (#e8e2d9), slight elevation (gentle box shadow)
  - Selected state card: elevated slightly more, border becomes deeper (#2d3d2e), soft inner glow
  - Confirm button: solid, no glass
- Typography: serif for the heading, clean sans-serif for time details
- Color palette: warm neutrals + deep olive green (#2d3d2e) as sole accent

---

PAGE STRUCTURE (top to bottom)

1. Heading area
   - Small label (muted, uppercase, tracking): "Homeward Breathwork"
   - Main heading (serif, relaxed): "Pick a time that works for you."
   - Subtext (small, muted): "If none of these work, let us know."

2. Slot cards grid
   - 4 cards, 2×2 grid on desktop, stacked on mobile
   - Each card contains:
       - Day + Date (e.g. "Thursday, April 17") — medium weight, serif
       - Time (e.g. "3:00 PM") — larger, prominent
       - Duration (e.g. "60 min") — small, muted
   - Default state: soft translucent card, unselected
   - Selected state: border deepens to olive green, subtle elevation increase, checkmark or dot indicator in top-right corner
   - Only one card selectable at a time

3. Confirm button
   - Label: "Confirm"
   - Disabled/muted state when no slot selected
   - Active state: deep olive green (#2d3d2e), pill shape, full comfortable width
   - Positioned below the cards, centered

4. Fallback link
   - Below the button, small muted text + underline link:
     "None of these work — let us know"

---

STATES TO DESIGN

State 1 — Default (no selection)
  - All 4 cards unselected
  - Confirm button is visible but visually inactive (muted color, not disabled per se)

State 2 — Selected (one card chosen)
  - One card in selected state
  - Confirm button activates to full olive green

State 3 — Confirmed (after clicking Confirm)
  - Cards and button disappear
  - Same page shows confirmation message:
    Heading: "You're all set."
    Subtext: "A confirmation will be sent to your email shortly."
  - No redirect, no animation complexity — clean fade or instant swap

---

CONSTRAINTS
- No navigation bar
- No logo image (text label only)
- No social links or footer
- No loading states needed
- Mobile-first layout — cards stack vertically on small screens
- Generous whitespace throughout — this should feel unhurried