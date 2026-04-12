import { store } from "@/lib/store";
import type { ActionType, AppEvent, BookingCase, BookingState } from "@/lib/types";

const STEP_LABELS: Record<BookingState, string> = {
  new_lead: "New inquiry",
  intake_pending: "Awaiting intake",
  fit_review: "Ready for your review",
  fit_confirmed: "Finding a time",
  awaiting_client_confirmation: "Waiting on client",
  booked: "Booked ✓",
  cancel_requested: "Cancellation requested",
  cancelled: "Cancelled",
  reschedule_requested: "Reschedule requested",
  reschedule_in_progress: "Finding new time",
  completed: "Completed ✓",
};

function isoNow() {
  return new Date().toISOString();
}

function applyStateChange(bookingCase: BookingCase, nextState: BookingState, content: string, timestamp: string) {
  store.updateCase(bookingCase.id, {
    state: nextState,
    current_step: STEP_LABELS[nextState],
    updated_at: timestamp,
  });

  store.addTimelineEntry({
    case_id: bookingCase.id,
    type: "state_change",
    content,
    metadata: { from_state: bookingCase.state, to_state: nextState },
    timestamp,
  });
}

function logAction(caseId: string, content: string, action: ActionType, automation: "auto" | "draft" | "manual", timestamp: string) {
  store.addTimelineEntry({
    case_id: caseId,
    type: "action",
    content,
    metadata: { action, automation_level: automation },
    timestamp,
  });
}

export async function onEvent(event: AppEvent) {
  const timestamp = isoNow();
  const bookingCase = store.getCase(event.case_id);

  if (!bookingCase) {
    throw new Error(`Unknown case: ${event.case_id}`);
  }

  store.addInteraction({
    case_id: bookingCase.id,
    channel: "admin_note",
    direction: "internal",
    content: `Event received: ${event.type}`,
    timestamp,
  });

  switch (event.type) {
    case "booking_inquiry_submitted": {
      store.updateCase(bookingCase.id, {
        state: "intake_pending",
        current_step: STEP_LABELS.intake_pending,
        updated_at: timestamp,
      });

      logAction(bookingCase.id, "System sent intake email", "send_intake_email", "auto", timestamp);
      store.logEmail({
        case_id: bookingCase.id,
        to: bookingCase.client_email,
        subject: "Tell us more",
        body: "Thanks for reaching out. A few quick questions will help me understand what you need.",
        sent_at: timestamp,
        source_action: "send_intake_email",
      });

      return { accepted: true, case_id: bookingCase.id, state: "intake_pending" as BookingState };
    }

    case "fit_review_completed": {
      if (event.payload.outcome !== "confirmed") {
        return { accepted: true, case_id: bookingCase.id, state: bookingCase.state };
      }

      store.updateCase(bookingCase.id, {
        paused_reason: null,
        updated_at: timestamp,
      });

      logAction(
        bookingCase.id,
        "Draft approved — fit confirmation email sent",
        "approve_fit",
        "draft",
        timestamp,
      );

      applyStateChange(bookingCase, "fit_confirmed", "Case moved to: Finding a time", timestamp);

      store.updateCase(bookingCase.id, {
        state: "awaiting_client_confirmation",
        current_step: STEP_LABELS.awaiting_client_confirmation,
        updated_at: timestamp,
      });

      logAction(
        bookingCase.id,
        "System sent available time slots",
        "propose_time_slots",
        "auto",
        timestamp,
      );
      store.logEmail({
        case_id: bookingCase.id,
        to: bookingCase.client_email,
        subject: "Available time slots",
        body: "Here are a few times that could work for your session.",
        sent_at: timestamp,
        source_action: "propose_time_slots",
      });
      store.addTimelineEntry({
        case_id: bookingCase.id,
        type: "state_change",
        content: "Case moved to: Waiting on client",
        metadata: { from_state: "fit_confirmed", to_state: "awaiting_client_confirmation" },
        timestamp,
      });

      return {
        accepted: true,
        case_id: bookingCase.id,
        state: "awaiting_client_confirmation" as BookingState,
      };
    }

    case "slot_selection_received": {
      if (event.payload.selection_type !== "confirmed") {
        return { accepted: true, case_id: bookingCase.id, state: bookingCase.state };
      }

      store.updateCase(bookingCase.id, {
        paused_reason: null,
        updated_at: timestamp,
      });

      const selectedSlot = String(event.payload.selected_slot ?? "Selected time slot");
      store.addTimelineEntry({
        case_id: bookingCase.id,
        type: "event",
        content: `${bookingCase.client_name} confirmed ${selectedSlot}`,
        timestamp,
      });
      logAction(
        bookingCase.id,
        "Draft approved — booking confirmation email sent",
        "confirm_booking",
        "draft",
        timestamp,
      );
      applyStateChange(bookingCase, "booked", "Case moved to: Booked", timestamp);
      logAction(
        bookingCase.id,
        "Reminder scheduled for upcoming session",
        "schedule_reminder",
        "auto",
        timestamp,
      );

      return { accepted: true, case_id: bookingCase.id, state: "booked" as BookingState };
    }

    case "cancel_request_received": {
      store.addTimelineEntry({
        case_id: bookingCase.id,
        type: "event",
        content: `${bookingCase.client_name} requested cancellation`,
        timestamp,
      });
      store.updateCase(bookingCase.id, {
        state: "cancel_requested",
        current_step: STEP_LABELS.cancel_requested,
        paused_reason: "Escalated to you — the system has stepped back",
        updated_at: timestamp,
      });
      store.addTimelineEntry({
        case_id: bookingCase.id,
        type: "state_change",
        content: "Case moved to: Cancellation requested",
        metadata: { from_state: bookingCase.state, to_state: "cancel_requested" },
        timestamp,
      });
      store.addTimelineEntry({
        case_id: bookingCase.id,
        type: "system_note",
        content: "System escalated to you — no draft generated",
        metadata: { automation_level: "manual" },
        timestamp,
      });

      return { accepted: true, case_id: bookingCase.id, state: "cancel_requested" as BookingState };
    }

    case "reminder_time_reached": {
      logAction(
        bookingCase.id,
        "Reminder scheduled for upcoming session",
        "schedule_reminder",
        "auto",
        timestamp,
      );
      return { accepted: true, case_id: bookingCase.id, state: bookingCase.state };
    }

    default:
      return { accepted: true, case_id: bookingCase.id, state: bookingCase.state };
  }
}
