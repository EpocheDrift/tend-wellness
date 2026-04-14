import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export function POST() {
  store.reset();
  return NextResponse.json({ reset: true });
}
