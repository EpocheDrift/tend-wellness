import { InMemoryStore } from "@/lib/store/core";
import { getActiveStore } from "@/lib/store/session";

export { InMemoryStore } from "@/lib/store/core";

// Session-aware facade: every property access resolves against the store bound
// to the current request's session (via AsyncLocalStorage), falling back to a
// process-wide default outside of a request. Existing call sites keep using
// `store.getCase(...)` etc. unchanged.
export const store: InMemoryStore = new Proxy({} as InMemoryStore, {
  get(_target, prop) {
    const active = getActiveStore();
    const value = Reflect.get(active, prop, active) as unknown;
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(active);
    }
    return value;
  },
});
