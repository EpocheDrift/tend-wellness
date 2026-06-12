import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE_SECONDS,
  SESSION_ID_PATTERN,
} from "@/lib/session-constants";
import { InMemoryStore } from "@/lib/store/core";

// Each browser session gets its own isolated store so concurrent demo visitors
// can't see or reset each other's state. Sessions are evicted after an hour of
// inactivity; a fresh visit after that simply re-seeds.
const SESSION_TTL_MS = 60 * 60 * 1000;
const MAX_SESSIONS = 100;

type SessionEntry = {
  store: InMemoryStore;
  lastAccess: number;
};

// All of this lives on globalThis so dev HMR and per-route module instances
// share one registry and one AsyncLocalStorage.
const globalForSessions = globalThis as typeof globalThis & {
  __tendSessions?: Map<string, SessionEntry>;
  __tendStoreContext?: AsyncLocalStorage<InMemoryStore>;
  __tendDefaultStore?: InMemoryStore;
};

const sessions = globalForSessions.__tendSessions ?? new Map<string, SessionEntry>();
globalForSessions.__tendSessions = sessions;

const storeContext =
  globalForSessions.__tendStoreContext ?? new AsyncLocalStorage<InMemoryStore>();
globalForSessions.__tendStoreContext = storeContext;

// Fallback for code that runs outside a wrapped request (tooling, module init).
const defaultStore = globalForSessions.__tendDefaultStore ?? new InMemoryStore();
globalForSessions.__tendDefaultStore = defaultStore;

export function getActiveStore(): InMemoryStore {
  return storeContext.getStore() ?? defaultStore;
}

function evictStale(now: number) {
  for (const [sessionId, entry] of sessions) {
    if (now - entry.lastAccess > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }

  if (sessions.size > MAX_SESSIONS) {
    const byOldest = Array.from(sessions.entries()).sort(
      (left, right) => left[1].lastAccess - right[1].lastAccess,
    );
    for (const [sessionId] of byOldest.slice(0, sessions.size - MAX_SESSIONS)) {
      sessions.delete(sessionId);
    }
  }
}

function getOrCreateSessionStore(sessionId: string): InMemoryStore {
  const now = Date.now();
  evictStale(now);

  const existing = sessions.get(sessionId);
  if (existing) {
    existing.lastAccess = now;
    return existing.store;
  }

  const store = new InMemoryStore();
  store.initialize();
  sessions.set(sessionId, { store, lastAccess: now });
  return store;
}

// Wraps a route handler so everything inside it (including the harness, which
// imports the store singleton) resolves to this session's store via ALS.
// Middleware normally issues the cookie on first page load; cookieless clients
// (curl, webhooks) get a per-request session via the Set-Cookie fallback here.
export function withSessionStore<Ctx>(
  handler: (request: NextRequest, context: Ctx) => Response | Promise<Response>,
) {
  return async (request: NextRequest, context: Ctx): Promise<Response> => {
    const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;
    const hasValidCookie = !!cookieValue && SESSION_ID_PATTERN.test(cookieValue);
    const sessionId = hasValidCookie && cookieValue ? cookieValue : randomUUID();

    const store = getOrCreateSessionStore(sessionId);
    const response = await storeContext.run(store, () => handler(request, context));

    if (!hasValidCookie) {
      response.headers.append(
        "Set-Cookie",
        `${SESSION_COOKIE}=${sessionId}; Path=/; SameSite=Lax; HttpOnly; Max-Age=${SESSION_COOKIE_MAX_AGE_SECONDS}`,
      );
    }

    return response;
  };
}
