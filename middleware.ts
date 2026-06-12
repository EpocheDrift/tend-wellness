import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_ID_PATTERN,
} from "@/lib/session-constants";

// Issues the demo session cookie on the very first page load, so all of a
// page's parallel API calls land in one session instead of racing to create
// several. The API layer has its own fallback for cookieless clients.
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  if (existing && SESSION_ID_PATTERN.test(existing)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE, crypto.randomUUID(), {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
