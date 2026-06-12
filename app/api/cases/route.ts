import { NextRequest, NextResponse } from "next/server";
import { withSessionStore } from "@/lib/store/session";
import { store } from "@/lib/store";

function handleGET() {
  return NextResponse.json({ items: store.listCases() });
}

async function handlePOST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    client_email?: string;
    client_name?: string;
    source?: string;
  };

  if (!body.client_email) {
    return NextResponse.json({ error: "client_email is required" }, { status: 400 });
  }

  const bookingCase = store.createCase({
    client_email: body.client_email,
    client_name: body.client_name,
    source: body.source ?? "debug_api",
  });

  return NextResponse.json(bookingCase, { status: 201 });
}

export const GET = withSessionStore(handleGET);
export const POST = withSessionStore(handlePOST);
