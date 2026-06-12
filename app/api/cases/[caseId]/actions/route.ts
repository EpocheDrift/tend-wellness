import { NextRequest, NextResponse } from "next/server";
import { withSessionStore } from "@/lib/store/session";
import { harnessErrorMessage, harnessErrorStatus } from "@/lib/harness/errors";
import { executeOwnerAction } from "@/lib/harness/on-event";
import { POLICY } from "@/lib/policy";
import { store } from "@/lib/store";
import type { ActionType } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

async function handlePOST(request: NextRequest, { params }: RouteContext) {
  const { caseId } = await params;
  const bookingCase = store.getCase(caseId);

  if (!bookingCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        action?: ActionType | "escalate_acknowledged";
        params?: Record<string, unknown>;
      }
    | null;

  if (!body?.action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const timestamp = new Date().toISOString();

  if (body.action === "escalate_acknowledged") {
    store.updateCase(caseId, {
      paused_reason: null,
      updated_at: timestamp,
    });
    store.addTimelineEntry({
      case_id: caseId,
      type: "system_note",
      content: "Owner acknowledged escalation and took over manually",
      metadata: { automation_level: "manual" },
      timestamp,
    });

    return NextResponse.json({
      case_id: caseId,
      action: body.action,
      result: "executed",
      state: store.getCase(caseId)?.state,
    });
  }

  const policy = POLICY[body.action];
  if (!policy) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const allowed = store.getAvailableActions(caseId)?.actions.some((item) => item.action === body.action);
  if (!allowed) {
    return NextResponse.json({
      case_id: caseId,
      action: body.action,
      result: "blocked",
      state: bookingCase.state,
    });
  }

  if (policy === "draft") {
    const draft = store.addDraft({
      case_id: caseId,
      action: body.action,
      status: "pending",
      channel: "email",
      subject: `Draft for ${body.action}`,
      body: `Generated draft for ${body.action}.`,
    });
    store.updateCase(caseId, {
      paused_reason: "Waiting for your approval before the system can proceed",
      updated_at: timestamp,
    });
    store.addTimelineEntry({
      case_id: caseId,
      type: "draft",
      content: "Draft ready — waiting for your approval",
      metadata: { automation_level: "draft", action: body.action },
      timestamp,
    });

    return NextResponse.json({
      case_id: caseId,
      action: body.action,
      result: "draft_created",
      state: bookingCase.state,
      draft_id: draft.id,
    });
  }

  try {
    const updatedCase = executeOwnerAction(caseId, body.action);

    return NextResponse.json({
      case_id: caseId,
      action: body.action,
      result: "executed",
      state: updatedCase.state,
    });
  } catch (error) {
    return NextResponse.json(
      { error: harnessErrorMessage(error) },
      { status: harnessErrorStatus(error) },
    );
  }
}

export const POST = withSessionStore(handlePOST);
