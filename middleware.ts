import { NextResponse, type NextRequest } from "next/server";
import {
  buildSessionCookie,
  SESSION_COOKIE,
  SESSION_ID_PATTERN,
} from "@/lib/session-constants";

// Issues the demo session cookie on first contact (typically a page load).
// Cookie issuance lives only here — route handlers never set session cookies,
// so a response can't carry two conflicting session ids. Requests that arrive
// without the cookie run against an ephemeral store (see lib/store/session.ts)
// and become persistent from their next request onward.
export function middleware(request: NextRequest) {
  const existing = request.cookies.get(SESSION_COOKIE)?.value;
  if (existing && SESSION_ID_PATTERN.test(existing)) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.headers.append("Set-Cookie", buildSessionCookie(crypto.randomUUID()));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
