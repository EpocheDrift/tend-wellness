import { NextRequest, NextResponse } from "next/server";
import { onEvent } from "@/lib/harness/on-event";
import { store } from "@/lib/store";

type RouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { draftId } = await params;
  const draft = store.getDraft(draftId);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        approved_by?: string;
        subject?: string;
        body?: string;
      }
    | null;

  if (!body?.body) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const timestamp = new Date().toISOString();
  const updatedDraft = store.updateDraft(draftId, {
    subject: body.subject ?? draft.subject,
    body: body.body,
    status: "sent",
    updated_at: timestamp,
  });

  store.logEmail({
    case_id: draft.case_id,
    to: store.getCase(draft.case_id)?.client_email ?? "unknown@example.com",
    subject: updatedDraft?.subject ?? draft.subject,
    body: updatedDraft?.body ?? body.body,
    sent_at: timestamp,
    source_action: draft.action,
  });

  if (draft.action === "approve_fit") {
    await onEvent({
      type: "fit_review_completed",
      case_id: draft.case_id,
      payload: { outcome: "confirmed", completed_at: timestamp },
    });
  }

  store.addInteraction({
    case_id: draft.case_id,
    channel: "admin_note",
    direction: "internal",
    content: `Draft edited and approved by ${body.approved_by ?? "owner"}`,
    timestamp,
  });

  return NextResponse.json({ draft_id: draftId, status: "sent", case_id: draft.case_id });
}
