import { NextRequest, NextResponse } from "next/server";
import { withSessionStore } from "@/lib/store/session";
import { harnessErrorMessage, harnessErrorStatus } from "@/lib/harness/errors";
import { onEvent } from "@/lib/harness/on-event";
import { store } from "@/lib/store";
import type { AppEvent, EventType } from "@/lib/types";

const DRAFT_TO_RESUME_EVENT: Record<string, EventType> = {
  approve_fit: "fit_review_completed",
  confirm_booking: "slot_selection_received",
  request_more_info: "client_message_received",
  offer_reschedule: "reschedule_offered_and_accepted",
  send_cancellation_reply: "client_message_received",
};

function buildResumeEvent(draftId: string): AppEvent | null {
  const draft = store.getDraft(draftId);
  if (!draft) {
    return null;
  }

  const type = DRAFT_TO_RESUME_EVENT[draft.action];
  if (!type) {
    return null;
  }

  const timestamp = new Date().toISOString();

  if (draft.action === "approve_fit") {
    return {
      type,
      case_id: draft.case_id,
      payload: {
        outcome: "confirmed",
        completed_at: timestamp,
        approved_draft_action: draft.action,
      },
    };
  }

  if (draft.action === "confirm_booking") {
    return {
      type,
      case_id: draft.case_id,
      payload: {
        selection_type: "confirmed",
        selected_slot: "Thursday, April 17 at 3:00 PM",
        approved_draft_action: draft.action,
      },
    };
  }

  return {
    type,
    case_id: draft.case_id,
    payload: {
      resumed_from_draft: draft.id,
      completed_at: timestamp,
      approved_draft_action: draft.action,
    },
  };
}

type RouteContext = {
  params: Promise<{
    draftId: string;
  }>;
};

async function handlePOST(request: NextRequest, { params }: RouteContext) {
  const { draftId } = await params;
  const draft = store.getDraft(draftId);

  if (!draft) {
    return NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  if (draft.status !== "pending") {
    return NextResponse.json(
      { error: `Draft is already ${draft.status}` },
      { status: 409 },
    );
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

  const resumeEvent = buildResumeEvent(draftId);
  if (resumeEvent) {
    try {
      await onEvent(resumeEvent);
    } catch (error) {
      return NextResponse.json(
        { error: harnessErrorMessage(error) },
        { status: harnessErrorStatus(error) },
      );
    }
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

export const POST = withSessionStore(handlePOST);
