import { NextRequest, NextResponse } from "next/server";
import { onEvent } from "@/lib/harness/on-event";
import { store } from "@/lib/store";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        email?: string;
        name?: string;
        message?: string;
      }
    | null;

  if (!body?.email || !body.name || !body.message) {
    return NextResponse.json({ error: "name, email, and message are required" }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  const bookingCase = store.createCase({
    client_email: body.email,
    client_name: body.name,
    source: "squarespace_form",
  });

  store.addTimelineEntry({
    case_id: bookingCase.id,
    type: "event",
    content: "Booking inquiry received via Squarespace form",
    timestamp,
  });
  store.addInteraction({
    case_id: bookingCase.id,
    channel: "web_form",
    direction: "inbound",
    content: body.message,
    timestamp,
  });

  await onEvent({
    type: "booking_inquiry_submitted",
    case_id: bookingCase.id,
    payload: {
      message: body.message,
      submitted_at: timestamp,
    },
  });

  return NextResponse.json({ accepted: true, case_id: bookingCase.id });
}
