import type {
  ActionType,
  AutomationLevel,
  AvailableAction,
  BookingState,
} from "@/lib/types";

export const POLICY: Record<ActionType, AutomationLevel> = {
  send_intake_email: "auto",
  request_more_info: "draft",
  approve_fit: "draft",
  propose_time_slots: "auto",
  confirm_booking: "draft",
  schedule_reminder: "auto",
  send_cancellation_reply: "draft",
  confirm_cancellation: "manual",
  offer_reschedule: "draft",
  propose_reschedule_slots: "auto",
  escalate_to_owner: "manual",
  mark_session_completed: "manual",
};

export const ALLOWED_ACTIONS: Record<BookingState, ActionType[]> = {
  new_lead: ["send_intake_email"],
  intake_pending: ["request_more_info", "escalate_to_owner"],
  fit_review: ["approve_fit", "request_more_info", "escalate_to_owner"],
  fit_confirmed: ["propose_time_slots"],
  awaiting_client_confirmation: ["propose_time_slots", "confirm_booking", "escalate_to_owner"],
  booked: ["schedule_reminder", "mark_session_completed"],
  cancel_requested: [
    "send_cancellation_reply",
    "confirm_cancellation",
    "offer_reschedule",
    "escalate_to_owner",
  ],
  cancelled: [],
  reschedule_requested: ["offer_reschedule", "propose_reschedule_slots", "escalate_to_owner"],
  reschedule_in_progress: [
    "request_more_info",
    "confirm_booking",
    "propose_reschedule_slots",
    "escalate_to_owner",
  ],
  completed: [],
};

export function policyCheck(action: ActionType, state: BookingState): AutomationLevel {
  if (!ALLOWED_ACTIONS[state].includes(action)) {
    throw new Error(`Action ${action} is not allowed in state ${state}`);
  }

  return POLICY[action];
}

export function getAvailableActions(state: BookingState): AvailableAction[] {
  return ALLOWED_ACTIONS[state].map((action) => ({
    action,
    policy: POLICY[action],
  }));
}
