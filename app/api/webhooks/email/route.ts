import { NextRequest, NextResponse } from "next/server";
import { withSessionStore } from "@/lib/store/session";
import { harnessErrorMessage, harnessErrorStatus } from "@/lib/harness/errors";
import { onEvent } from "@/lib/harness/on-event";
import { store } from "@/lib/store";
import type { EventType } from "@/lib/types";

function normalizeEmailEvent(subject: string, body: string, state: string): EventType {
  const combined = `${subject} ${body}`.toLowerCase();

  if (state === "reschedule_in_progress" && (combined.includes("confirm") || combined.includes("thursday") || combined.includes("april"))) {
    return "reschedule_slot_selection_received";
  }

  if (combined.includes("cancel")) {
    return "cancel_request_received";
  }

  if (combined.includes("reschedule")) {
    return "reschedule_request_received";
  }

  if (state === "awaiting_client_confirmation" && (combined.includes("confirm") || combined.includes("thursday") || combined.includes("april"))) {
    return "slot_selection_received";
  }

  return "client_message_received";
}

async function handlePOST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        case_id?: string;
        from?: string;
        subject?: string;
        body?: string;
        received_at?: string;
      }
    | null;

  if (!body?.case_id || !body.from || !body.subject || !body.body || !body.received_at) {
    return NextResponse.json(
      { error: "case_id, from, subject, body, and received_at are required" },
      { status: 400 },
    );
  }

  const bookingCase = store.getCase(body.case_id);
  if (!bookingCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const normalizedEventType = normalizeEmailEvent(body.subject, body.body, bookingCase.state);
  store.addInteraction({
    case_id: bookingCase.id,
    channel: "email",
    direction: "inbound",
    content: body.body,
    timestamp: body.received_at,
  });

  try {
    await onEvent({
      type: normalizedEventType,
      case_id: bookingCase.id,
      payload:
        normalizedEventType === "slot_selection_received" || normalizedEventType === "reschedule_slot_selection_received"
          ? {
              selection_type: "confirmed",
              selected_slot: body.subject,
              received_at: body.received_at,
            }
          : {
              from: body.from,
              subject: body.subject,
              body: body.body,
              received_at: body.received_at,
            },
    });
  } catch (error) {
    return NextResponse.json(
      { error: harnessErrorMessage(error) },
      { status: harnessErrorStatus(error) },
    );
  }

  return NextResponse.json({
    accepted: true,
    normalized_event_type: normalizedEventType,
    case_id: bookingCase.id,
  });
}

export const POST = withSessionStore(handlePOST);
