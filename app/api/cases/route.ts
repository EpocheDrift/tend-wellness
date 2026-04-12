import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store";

export function GET() {
  return NextResponse.json({ items: store.listCases() });
}

export async function POST(request: NextRequest) {
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
