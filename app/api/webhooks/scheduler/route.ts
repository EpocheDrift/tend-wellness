import { NextRequest, NextResponse } from "next/server";
import { onEvent } from "@/lib/harness/on-event";

export async function POST(request: NextRequest) {
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

  await onEvent({
    type: body.type,
    case_id: body.case_id,
    payload: body.payload ?? {},
  });

  return NextResponse.json({ accepted: true });
}
