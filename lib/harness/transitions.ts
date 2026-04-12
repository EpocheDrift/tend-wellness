import type { ActionType, BookingState } from "@/lib/types";

export const STEP_LABELS: Record<BookingState, string> = {
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

export const TRANSITIONS: Partial<Record<BookingState, Partial<Record<ActionType, BookingState>>>> = {
  new_lead: {
    send_intake_email: "intake_pending",
  },
  fit_review: {
    approve_fit: "fit_confirmed",
    request_more_info: "intake_pending",
  },
  fit_confirmed: {
    propose_time_slots: "awaiting_client_confirmation",
  },
  awaiting_client_confirmation: {
    confirm_booking: "booked",
  },
  booked: {
    mark_session_completed: "completed",
  },
  cancel_requested: {
    confirm_cancellation: "cancelled",
    offer_reschedule: "reschedule_requested",
  },
  reschedule_requested: {
    propose_reschedule_slots: "reschedule_in_progress",
  },
  reschedule_in_progress: {
    confirm_booking: "booked",
    request_more_info: "reschedule_in_progress",
  },
};

export function getNextState(state: BookingState, action: ActionType): BookingState | null {
  return TRANSITIONS[state]?.[action] ?? null;
}
