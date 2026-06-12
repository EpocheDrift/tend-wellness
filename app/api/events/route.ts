import { NextRequest, NextResponse } from "next/server";
import { harnessErrorMessage, harnessErrorStatus } from "@/lib/harness/errors";
import { onEvent } from "@/lib/harness/on-event";
import type { AppEvent, EventType } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | {
        type?: EventType;
        case_id?: string;
        payload?: Record<string, unknown>;
      }
    | null;

  if (!body?.type || !body.case_id) {
    return NextResponse.json({ error: "type and case_id are required" }, { status: 400 });
  }

  const event: AppEvent = {
    type: body.type,
    case_id: body.case_id,
    payload: body.payload ?? {},
  };

  try {
    await onEvent(event);
  } catch (error) {
    return NextResponse.json(
      { error: harnessErrorMessage(error) },
      { status: harnessErrorStatus(error) },
    );
  }

  return NextResponse.json({
    accepted: true,
    event_id: `event_${Date.now()}`,
    case_id: event.case_id,
    status: "processed",
  });
}
