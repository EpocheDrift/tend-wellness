// Shared by middleware (edge-compatible) and the Node session layer — keep this
// module free of Node-only imports.
export const SESSION_COOKIE = "tend_session";
export const SESSION_ID_PATTERN = /^[a-zA-Z0-9-]{8,64}$/;
export const SESSION_COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

export function buildSessionCookie(sessionId: string): string {
  return `${SESSION_COOKIE}=${sessionId}; Path=/; SameSite=Lax; HttpOnly; Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}`;
}
