import type { Result } from "./types";

/** Results typed before signing in; uploaded to the account on the next login. */
export const GUEST_KEY = "ritm.guest.results";
export const GUEST_LIMIT = 500;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;

const storage = (): Store => {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
};

export function readGuest(st: Store = storage()): Result[] {
  try {
    const raw = st?.getItem(GUEST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushGuest(result: Result, st: Store = storage()) {
  const all = [...readGuest(st), result].slice(-GUEST_LIMIT);
  try { st?.setItem(GUEST_KEY, JSON.stringify(all)); } catch { /* storage full or blocked */ }
}

export function clearGuest(st: Store = storage()) {
  try { st?.removeItem(GUEST_KEY); } catch { /* nothing to clear */ }
}
