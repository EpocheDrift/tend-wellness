import { NextResponse } from "next/server";
import { withSessionStore } from "@/lib/store/session";
import { store } from "@/lib/store";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

async function handleGET(_request: Request, { params }: RouteContext) {
  const { caseId } = await params;
  const availableActions = store.getAvailableActions(caseId);

  if (!availableActions) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(availableActions);
}

export const GET = withSessionStore(handleGET);
