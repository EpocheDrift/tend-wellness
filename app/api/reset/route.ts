import { NextResponse } from "next/server";
import { withSessionStore } from "@/lib/store/session";
import { store } from "@/lib/store";

function handlePOST() {
  store.reset();
  return NextResponse.json({ reset: true });
}

export const POST = withSessionStore(handlePOST);
