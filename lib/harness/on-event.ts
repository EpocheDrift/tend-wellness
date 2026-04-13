import { buildContext } from "@/lib/harness/context-builder";
import { policyCheck } from "@/lib/harness/policy";
import { runAgent } from "@/lib/harness/agent";
import { getNextState, STEP_LABELS } from "@/lib/harness/transitions";
import { store } from "@/lib/store";
import type {
  ActionType,
  AgentDecision,
  AppEvent,
  BookingCase,
  BookingState,
  IntentDecision,
} from "@/lib/types";

const MAX_ITERATIONS = 5;

function isoNow() {
  return new Date().toISOString();
}

function refreshCase(caseId: string) {
  const bookingCase = store.getCase(caseId);
  if (!bookingCase) {
    throw new Error(`Unknown case: ${caseId}`);
  }
  return bookingCase;
}

function updateCaseState(caseId: string, nextState: BookingState, timestamp: string) {
  const previous = refreshCase(caseId);
  store.updateCase(caseId, {
    state: nextState,
    current_step: STEP_LABELS[nextState],
    updated_at: timestamp,
  });
  store.addTimelineEntry({
    case_id: caseId,
    type: "state_change",
    content: `Case moved to: ${STEP_LABELS[nextState]}`,
    metadata: { from_state: previous.state, to_state: nextState },
    timestamp,
  });
}

function logAction(caseId: string, action: ActionType, content: string, level: "auto" | "draft" | "manual", timestamp: string) {
  store.addTimelineEntry({
    case_id: caseId,
    type: "action",
    content,
    metadata: { action, automation_level: level },
    timestamp,
  });
}

function logEvent(caseId: string, content: string, timestamp: string) {
  store.addTimelineEntry({
    case_id: caseId,
    type: "event",
    content,
    timestamp,
  });
}

function createDraft(caseId: string, action: ActionType, timestamp: string) {
  const draft = store.addDraft({
    case_id: caseId,
    action,
    status: "pending",
    channel: "email",
    subject:
      action === "approve_fit"
        ? "Next steps for your session"
        : action === "confirm_booking"
          ? "Your session is confirmed"
          : `Draft for ${action}`,
    body:
      action === "approve_fit"
        ? "Hi, thanks for sharing more about what you're looking for. I think this could be a great fit."
        : action === "confirm_booking"
          ? "You're all set — looking forward to it."
          : `Generated draft for ${action}.`,
  });
  store.updateCase(caseId, {
    paused_reason: "Waiting for your approval before the system can proceed",
    updated_at: timestamp,
  });
  store.addTimelineEntry({
    case_id: caseId,
    type: "draft",
    content: "Draft ready — waiting for your approval",
    metadata: { automation_level: "draft", action },
    timestamp,
  });
  return draft;
}

function executeTool(action: ActionType, bookingCase: BookingCase, timestamp: string) {
  switch (action) {
    case "send_intake_email": {
      store.logEmail({
        case_id: bookingCase.id,
        to: bookingCase.client_email,
        subject: "Tell us more",
        body: "Thanks for reaching out. A few quick questions will help me understand what you need.",
        sent_at: timestamp,
        source_action: action,
      });
      logAction(bookingCase.id, action, "System sent intake email", "auto", timestamp);
      return { status: "sent" };
    }

    case "propose_time_slots": {
      store.logEmail({
        case_id: bookingCase.id,
        to: bookingCase.client_email,
        subject: "Available time slots",
        body: "Here are a few times that could work for your session.",
        sent_at: timestamp,
        source_action: action,
      });
      logAction(bookingCase.id, action, "System sent available time slots", "auto", timestamp);
      return { status: "sent" };
    }

    case "schedule_reminder": {
      logAction(bookingCase.id, action, "Reminder scheduled for upcoming session", "auto", timestamp);
      return { scheduled: true };
    }

    case "escalate_to_owner": {
      store.updateCase(bookingCase.id, {
        paused_reason: "Escalated to you — the system has stepped back",
        updated_at: timestamp,
      });
      store.addTimelineEntry({
        case_id: bookingCase.id,
        type: "system_note",
        content: "System escalated to you — no draft generated",
        metadata: { automation_level: "manual" },
        timestamp,
      });
      return { escalated: true };
    }

    default:
      return { ok: true };
  }
}

function validateEventForState(event: AppEvent, bookingCase: BookingCase) {
  if (event.type === "booking_inquiry_submitted" && bookingCase.state !== "new_lead") {
    throw new Error(`Event ${event.type} is invalid for state ${bookingCase.state}`);
  }

  if (event.type === "fit_review_completed" && bookingCase.state !== "fit_review") {
    throw new Error(`Event ${event.type} is invalid for state ${bookingCase.state}`);
  }

  if (event.type === "slot_selection_received" && bookingCase.state !== "awaiting_client_confirmation") {
    throw new Error(`Event ${event.type} is invalid for state ${bookingCase.state}`);
  }

  if (event.type === "cancel_request_received" && bookingCase.state !== "booked") {
    throw new Error(`Event ${event.type} is invalid for state ${bookingCase.state}`);
  }

  if (event.type === "reschedule_request_received" && bookingCase.state !== "booked") {
    throw new Error(`Event ${event.type} is invalid for state ${bookingCase.state}`);
  }

  if (event.type === "reschedule_slot_selection_received" && bookingCase.state !== "reschedule_in_progress") {
    throw new Error(`Event ${event.type} is invalid for state ${bookingCase.state}`);
  }
}

function needsIntentClassification(bookingCase: BookingCase, event: AppEvent) {
  return bookingCase.state === "cancel_requested" && event.type === "client_message_received";
}

function handleIntentClassification(intentDecision: IntentDecision, bookingCase: BookingCase, timestamp: string) {
  if (intentDecision.intent === "confirm_cancel") {
    updateCaseState(bookingCase.id, "cancelled", timestamp);
    logAction(bookingCase.id, "confirm_cancellation", "Cancellation confirmed manually", "manual", timestamp);
    return { accepted: true, case_id: bookingCase.id, state: "cancelled" as BookingState };
  }

  if (intentDecision.intent === "reschedule") {
    updateCaseState(bookingCase.id, "reschedule_requested", timestamp);
    return { accepted: true, case_id: bookingCase.id, state: "reschedule_requested" as BookingState };
  }

  createDraft(bookingCase.id, "request_more_info", timestamp);
  return { accepted: true, case_id: bookingCase.id, state: bookingCase.state };
}

function resumeApprovedDraft(bookingCase: BookingCase, event: AppEvent, timestamp: string) {
  const approvedAction = event.payload.approved_draft_action as ActionType | undefined;
  if (!approvedAction) {
    return refreshCase(bookingCase.id);
  }

  logAction(
    bookingCase.id,
    approvedAction,
    approvedAction === "approve_fit"
      ? "Draft approved — fit confirmation email sent"
      : approvedAction === "confirm_booking"
        ? "Draft approved — booking confirmation email sent"
        : `Draft approved — ${approvedAction} sent`,
    "draft",
    timestamp,
  );

  store.updateCase(bookingCase.id, {
    paused_reason: null,
    updated_at: timestamp,
  });

  const nextState = getNextState(bookingCase.state, approvedAction);
  if (nextState) {
    updateCaseState(bookingCase.id, nextState, timestamp);
  }

  return refreshCase(bookingCase.id);
}

function shouldContinueAfterApprovedDraft(action: ActionType | undefined) {
  return action === "approve_fit" || action === "offer_reschedule";
}

function preprocessEvent(event: AppEvent, bookingCase: BookingCase, timestamp: string) {
  if (event.type === "cancel_request_received") {
    logEvent(bookingCase.id, `${bookingCase.client_name ?? "Client"} requested cancellation`, timestamp);
    updateCaseState(bookingCase.id, "cancel_requested", timestamp);
    return refreshCase(bookingCase.id);
  }

  if (event.type === "reschedule_request_received") {
    logEvent(bookingCase.id, `${bookingCase.client_name ?? "Client"} requested to reschedule`, timestamp);
    updateCaseState(bookingCase.id, "reschedule_requested", timestamp);
    return refreshCase(bookingCase.id);
  }

  if (event.type === "reschedule_slot_selection_received" && event.payload.selection_type === "confirmed") {
    logEvent(bookingCase.id, `${bookingCase.client_name ?? "Client"} selected ${String(event.payload.selected_slot ?? "a new time slot")}`, timestamp);
  }

  return bookingCase;
}

export async function onEvent(event: AppEvent) {
  let bookingCase = refreshCase(event.case_id);
  validateEventForState(event, bookingCase);

  const timestamp = isoNow();

  if (event.type === "fit_review_completed" && event.payload.outcome === "rejected") {
    executeTool("escalate_to_owner", bookingCase, timestamp);
    return { accepted: true, case_id: bookingCase.id, state: bookingCase.state };
  }

  if (event.payload.approved_draft_action) {
    bookingCase = resumeApprovedDraft(bookingCase, event, timestamp);
    if (!shouldContinueAfterApprovedDraft(event.payload.approved_draft_action as ActionType | undefined)) {
      return { accepted: true, case_id: bookingCase.id, state: bookingCase.state };
    }
  }

  // Direct event-triggered transitions (no agent action; SSOT row with "—" in action column)
  // After transitioning, fall through to agent loop so it can generate the approve_fit draft.
  if (event.type === "intake_information_completed" && bookingCase.state === "intake_pending") {
    logEvent(bookingCase.id, `${bookingCase.client_name ?? "Client"} completed intake form`, timestamp);
    updateCaseState(bookingCase.id, "fit_review", timestamp);
    bookingCase = refreshCase(bookingCase.id);
  }

  bookingCase = preprocessEvent(event, bookingCase, timestamp);

  store.addInteraction({
    case_id: bookingCase.id,
    channel: "admin_note",
    direction: "internal",
    content: `Event received: ${event.type}`,
    timestamp,
  });

  if (event.type === "slot_selection_received" && event.payload.selection_type === "confirmed") {
    logEvent(bookingCase.id, `${bookingCase.client_name ?? "Client"} confirmed ${String(event.payload.selected_slot ?? "a time slot")}`, timestamp);
  }

  let iterations = 0;
  while (iterations < MAX_ITERATIONS) {
    iterations += 1;
    bookingCase = refreshCase(bookingCase.id);

    const contextString = buildContext(bookingCase, event);
    const decision = await runAgent(bookingCase, event, contextString);

    if (needsIntentClassification(bookingCase, event)) {
      return handleIntentClassification(decision as IntentDecision, bookingCase, timestamp);
    }

    const action = (decision as AgentDecision).action;
    const level = policyCheck(action, bookingCase.state);

    if (level === "auto") {
      executeTool(action, bookingCase, timestamp);
      const nextState = getNextState(bookingCase.state, action);
      if (nextState) {
        updateCaseState(bookingCase.id, nextState, timestamp);
      }

      if (!(decision as AgentDecision).has_more_actions) {
        break;
      }
      continue;
    }

    if (level === "draft") {
      createDraft(bookingCase.id, action, timestamp);
      break;
    }

    executeTool("escalate_to_owner", bookingCase, timestamp);
    break;
  }

  bookingCase = refreshCase(bookingCase.id);
  return { accepted: true, case_id: bookingCase.id, state: bookingCase.state };
}
