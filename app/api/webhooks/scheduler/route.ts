import { NextRequest, NextResponse } from "next/server";
import { withSessionStore } from "@/lib/store/session";
import { harnessErrorMessage, harnessErrorStatus } from "@/lib/harness/errors";
import { onEvent } from "@/lib/harness/on-event";

async function handlePOST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        type?: "reminder_time_reached";
        case_id?: string;
        payload?: Record<string, unknown>;
      }
    | null;

  if (body?.type !== "reminder_time_reached" || !body.case_id) {
    return NextResponse.json({ error: "type=reminder_time_reached and case_id are required" }, { status: 400 });
  }

  try {
    await onEvent({
      type: body.type,
      case_id: body.case_id,
      payload: body.payload ?? {},
    });
  } catch (error) {
    return NextResponse.json(
      { error: harnessErrorMessage(error) },
      { status: harnessErrorStatus(error) },
    );
  }

  return NextResponse.json({ accepted: true });
}

export const POST = withSessionStore(handlePOST);
