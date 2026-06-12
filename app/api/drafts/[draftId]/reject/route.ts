import { NextRequest, NextResponse } from "next/server";
import { withSessionStore } from "@/lib/store/session";
import { store } from "@/lib/store";

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

  const body = (await request.json().catch(() => ({}))) as { rejected_by?: string; reason?: string };
  const timestamp = new Date().toISOString();

  store.updateDraft(draftId, {
    status: "rejected",
    updated_at: timestamp,
  });
  store.addTimelineEntry({
    case_id: draft.case_id,
    type: "system_note",
    content: `Draft rejected by ${body.rejected_by ?? "owner"}`,
    metadata: { automation_level: "manual" },
    timestamp,
  });

  return NextResponse.json({ draft_id: draftId, status: "rejected", reason: body.reason ?? null });
}

export const POST = withSessionStore(handlePOST);
