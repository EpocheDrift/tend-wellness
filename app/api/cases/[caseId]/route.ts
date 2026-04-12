import { NextResponse } from "next/server";
import { store } from "@/lib/store";

type RouteContext = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { caseId } = await params;
  const bookingCase = store.getCase(caseId);

  if (!bookingCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }

  return NextResponse.json(bookingCase);
}
