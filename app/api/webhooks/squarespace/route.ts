import { NextRequest, NextResponse } from "next/server";
import { withSessionStore } from "@/lib/store/session";
import { harnessErrorMessage, harnessErrorStatus } from "@/lib/harness/errors";
import { onEvent } from "@/lib/harness/on-event";
import { store } from "@/lib/store";

async function handlePOST(request: NextRequest) {
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
  // createCase writes the "Booking inquiry received..." timeline entry based on source.
  const bookingCase = store.createCase({
    client_email: body.email,
    client_name: body.name,
    source: "squarespace_form",
  });

  store.addInteraction({
    case_id: bookingCase.id,
    channel: "web_form",
    direction: "inbound",
    content: body.message,
    timestamp,
  });

  try {
    await onEvent({
      type: "booking_inquiry_submitted",
      case_id: bookingCase.id,
      payload: {
        message: body.message,
        submitted_at: timestamp,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: harnessErrorMessage(error) },
      { status: harnessErrorStatus(error) },
    );
  }

  return NextResponse.json({ accepted: true, case_id: bookingCase.id });
}

export const POST = withSessionStore(handlePOST);
