export type BookingState =
  | "new_lead"
  | "intake_pending"
  | "fit_review"
  | "fit_confirmed"
  | "awaiting_client_confirmation"
  | "booked"
  | "cancel_requested"
  | "cancelled"
  | "reschedule_requested"
  | "reschedule_in_progress"
  | "completed";

export type AutomationLevel = "auto" | "draft" | "manual";

export type ActionType =
  | "send_intake_email"
  | "request_more_info"
  | "approve_fit"
  | "propose_time_slots"
  | "confirm_booking"
  | "schedule_reminder"
  | "send_cancellation_reply"
  | "confirm_cancellation"
  | "offer_reschedule"
  | "propose_reschedule_slots"
  | "escalate_to_owner"
  | "mark_session_completed";

export type BookingCase = {
  id: string;
  state: BookingState;
  client_email: string;
  client_name?: string;
  source?: string;
  paused_reason?: string | null;
  current_step?: string;
  created_at: string;
  updated_at: string;
};

export type TimelineEntry = {
  id: string;
  case_id: string;
  type: "event" | "action" | "state_change" | "draft" | "system_note";
  content: string;
  metadata?: {
    automation_level?: AutomationLevel;
    action?: string;
    from_state?: string;
    to_state?: string;
  };
  timestamp: string;
};

export type Draft = {
  id: string;
  case_id: string;
  action: ActionType;
  status: "pending" | "approved" | "rejected" | "sent";
  channel: "email";
  subject: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export type Interaction = {
  id: string;
  case_id: string;
  channel: "email" | "web_form" | "admin_note";
  direction: "inbound" | "outbound" | "internal";
  content: string;
  timestamp: string;
};

export type MockEmailLog = {
  id: string;
  case_id: string;
  to: string;
  subject: string;
  body: string;
  sent_at: string;
  source_action: ActionType;
};

export type SeedPayload = {
  cases: BookingCase[];
  drafts: Draft[];
  timeline: TimelineEntry[];
  interactions: Interaction[];
  emailLog: MockEmailLog[];
};
