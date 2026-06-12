import { AsyncLocalStorage } from "node:async_hooks";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, SESSION_ID_PATTERN } from "@/lib/session-constants";
import { InMemoryStore } from "@/lib/store/core";

// Each browser session gets its own isolated store so concurrent demo visitors
// can't see or reset each other's state. Only requests that present the session
// cookie get a registered (persistent) store — first-contact and cookieless
// requests run against an ephemeral store that is never registered, so bots and
// webhook callers can't flood the registry and evict real visitors.
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // matches the cookie Max-Age
const SWEEP_INTERVAL_MS = 60 * 1000;
const MAX_SESSIONS = 200;

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

let warnedAboutFallback = false;

export function getActiveStore(): InMemoryStore {
  const active = storeContext.getStore();
  if (active) {
    return active;
  }

  // A store access outside withSessionStore means a route forgot the wrapper —
  // it would silently share state across all visitors. Surface it loudly once.
  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      "[tend] store accessed outside a session context — falling back to the shared default store. " +
        "If this happened in a route handler, wrap it with withSessionStore.",
    );
  }
  return defaultStore;
}

let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS && sessions.size <= MAX_SESSIONS) {
    return;
  }
  lastSweep = now;

  for (const [sessionId, entry] of sessions) {
    if (now - entry.lastAccess > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }

  while (sessions.size > MAX_SESSIONS) {
    let oldestId: string | null = null;
    let oldestAccess = Infinity;
    for (const [sessionId, entry] of sessions) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestId = sessionId;
      }
    }
    if (!oldestId) {
      break;
    }
    sessions.delete(oldestId);
  }
}

function getOrCreateSessionStore(sessionId: string): InMemoryStore {
  const now = Date.now();
  sweep(now);

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

function createEphemeralStore(): InMemoryStore {
  const store = new InMemoryStore();
  store.initialize();
  return store;
}

// Wraps a route handler so everything inside it (including the harness, which
// imports the store singleton) resolves to this session's store via ALS.
//
// Store resolution: a valid session cookie gets the session's persistent
// store; anything else (first contact, bots, webhook callers) gets an
// ephemeral store that is never registered. Cookie issuance lives entirely in
// middleware — handlers never set cookies, so a response can't carry two
// conflicting session ids. Browsers always pick up the cookie on the page
// load that precedes their first API call, so no real visitor state is lost.
export function withSessionStore<Ctx>(
  handler: (request: NextRequest, context: Ctx) => Response | Promise<Response>,
) {
  return async (request: NextRequest, context: Ctx): Promise<Response> => {
    const cookieValue = request.cookies.get(SESSION_COOKIE)?.value;

    const store =
      cookieValue && SESSION_ID_PATTERN.test(cookieValue)
        ? getOrCreateSessionStore(cookieValue)
        : createEphemeralStore();

    return storeContext.run(store, () => handler(request, context));
  };
}
