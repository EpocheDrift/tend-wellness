# EndUser Flow Spec v0.1

Tend Demo

## 0. Overview

This document defines the End User experience flow for the booking system.

It translates:

- State machine
- Event / Action model
- Harness behavior

Into:

👉 What the user sees, does, and feels.

### Core Principle

The user should experience a simple, guided interaction, while the system handles complexity in the background.

## 1. Entry Point

### Scenario

Booking Inquiry (Primary Flow)

### Entry Channel

- Embedded form (e.g. Squarespace)
- Direct link

### User Sees

- A clean, minimal intake form
- Short introduction text

### Example Copy

> “Tell me a bit about what you're looking for — I’ll follow up with next steps.”

### User Does

Inputs basic info:

- name
- contact (email)
- short intent (free text or multiple choice)

### User Feels

- Low friction
- Not like filling a long form
- Personal and intentional

## 2. Intake Step

### Trigger

`booking_inquiry_submitted → intake_pending`

### User Sees

- A short follow-up intake form (if needed)
- Or confirmation message if intake is already complete

### Example Copy

> “Got it — just a couple more quick questions before we continue.”

### User Does

Answers 2–4 additional questions, for example:

- experience level
- goals
- availability preferences

### User Feels

- Guided
- Not overwhelmed
- Process is progressing

## 3. Fit Review (Invisible Step)

### Trigger

`intake_information_completed → fit_review`

### User Sees

Nothing interactive.

Instead, the user sees a status message or waiting state.

### Example Copy

> “Thanks — I’m taking a quick look and will follow up shortly.”

### User Does

Nothing. The user is waiting.

### User Feels

- Acknowledged
- Not ignored
- Expecting response

## 4. Fit Outcome

### Case A: Fit Confirmed (Primary Path)

#### Trigger

`fit_review_completed {confirmed} → fit_confirmed`

#### User Sees

A message introducing the next step.

#### Example Copy

> “This looks like a great fit — here are a few times that could work.”

### Case B: Needs More Info

#### Trigger

`fit_review_completed {needs_more_info} → intake_pending`

#### User Sees

A short follow-up question.

#### Example Copy

> “Quick follow-up — could you share a bit more about your schedule?”

### Case C: Not a Fit (Edge Case)

#### User Sees

A polite rejection or redirection.

#### Example Copy

> “Thanks for sharing — I don’t think this is the best fit right now, but happy to point you to other options.”

## 5. Time Slot Proposal

### Trigger

`propose_time_slots → awaiting_client_confirmation`

### User Sees

A small set of available time slots (3–5 options).

### UI Structure

Simple list or cards showing:

- date
- time
- duration

### Example Copy

> “Here are a few options — pick what works best for you.”

### User Does

- Selects one option
- Or clicks “None of these work”

### User Feels

- In control
- Easy decision
- Not overwhelmed

## 6. Slot Selection Outcomes

### Case A: Selects a Slot

#### Trigger

`slot_selection_received {confirmed} → booked`

#### User Sees

A confirmation message.

#### Example Copy

> “You're all set — looking forward to it.”

### Case B: Needs Other Options

#### Trigger

`slot_selection_received {needs_other_options}`

#### User Sees

Updated slots on the same screen, refreshed.

#### Example Copy

> “Got it — here are a few more options.”

#### User Feels

- Flexible
- Not blocked

## 7. Confirmation & Pre-Session

### State

`booked`

### User Sees

A confirmation summary including:

- time
- session type
- optional notes

### Reminder Behavior

Triggered by:

`reminder_time_reached`

### User Sees

A reminder message.

### Example Copy

> “Just a quick reminder — your session is coming up soon.”

### User Feels

- Supported
- Not spammed

## 8. Completion

### Trigger

`session_marked_completed → completed`

### User Sees (Optional for Demo)

A completion or follow-up message.

### Example Copy

> “Thanks for the session — feel free to reach out anytime.”

## Cross-Cutting UX Rules

### 1. No System Exposure

Never show:

- states
- events
- system logic

### 2. Short Interaction Units

Each step should include:

- no more than 1 main action
- no more than 1 decision

### 3. Always Clear “What’s Next”

The user should never wonder:

> “What happens now?”

### 4. Waiting Is Designed

Waiting does not mean blank.

Always show:

- acknowledgement
- expectation

### 5. Tone Consistency

- calm
- human
- concise
