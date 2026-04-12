import type { AgentDecision, AppEvent, BookingCase, IntentDecision } from "@/lib/types";

const SYSTEM_PROMPT = [
  "You are the Tend Harness agent.",
  "Return only valid JSON.",
  "If the task is action selection, return {\"action\":\"...\",\"params\":{},\"reasoning\":\"...\",\"has_more_actions\":false}.",
  "If the task is intent classification in cancel_requested, return {\"intent\":\"confirm_cancel|reschedule|unclear\"}.",
  "Never select an action outside the allowed_actions in context.",
].join(" ");

function heuristicDecision(bookingCase: BookingCase, event: AppEvent): AgentDecision | IntentDecision {
  if (bookingCase.state === "cancel_requested" && event.type === "client_message_received") {
    const text = JSON.stringify(event.payload).toLowerCase();
    if (text.includes("reschedule")) return { intent: "reschedule" };
    if (text.includes("cancel")) return { intent: "confirm_cancel" };
    return { intent: "unclear" };
  }

  if (bookingCase.state === "new_lead" && event.type === "booking_inquiry_submitted") {
    return { action: "send_intake_email", params: {}, reasoning: "Initial outreach", has_more_actions: false };
  }

  if (bookingCase.state === "fit_confirmed") {
    return { action: "propose_time_slots", params: {}, reasoning: "Move into scheduling", has_more_actions: false };
  }

  if (bookingCase.state === "awaiting_client_confirmation" && event.type === "slot_selection_received") {
    return { action: "confirm_booking", params: {}, reasoning: "Client selected a slot", has_more_actions: false };
  }

  if (bookingCase.state === "reschedule_requested") {
    return { action: "propose_reschedule_slots", params: {}, reasoning: "Offer new time options", has_more_actions: false };
  }

  if (bookingCase.state === "reschedule_in_progress" && event.type === "reschedule_slot_selection_received") {
    return { action: "confirm_booking", params: {}, reasoning: "Client selected a new slot", has_more_actions: false };
  }

  if (bookingCase.state === "booked" && event.type === "reminder_time_reached") {
    return { action: "schedule_reminder", params: {}, reasoning: "Reminder is due", has_more_actions: false };
  }

  if (bookingCase.state === "cancel_requested") {
    return { action: "escalate_to_owner", params: {}, reasoning: "Sensitive cancellation flow", has_more_actions: false };
  }

  return { action: "request_more_info", params: {}, reasoning: "Fallback", has_more_actions: false };
}

export async function runAgent(bookingCase: BookingCase, event: AppEvent, contextString: string) {
  const apiKey = process.env.MINIMAX_API_KEY;

  if (!apiKey) {
    return heuristicDecision(bookingCase, event);
  }

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      apiKey,
      baseURL: "https://api.minimaxi.com/v1",
    });

    const response = await client.chat.completions.create({
      model: "MiniMax-M2.5",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contextString },
      ],
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return heuristicDecision(bookingCase, event);
    }

    return JSON.parse(content) as AgentDecision | IntentDecision;
  } catch {
    return heuristicDecision(bookingCase, event);
  }
}
