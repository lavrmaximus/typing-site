import type { Result } from "./types";

/** Same bounds as the API. Pasted text or a test finished in under a second is not a typing result. */
export function isPlausible(r: Result): boolean {
  const ok = (v: number, lo: number, hi: number) => Number.isFinite(v) && v >= lo && v <= hi;
  return ok(r.cpm, 0, 2000) && ok(r.accuracy, 0, 100) && ok(r.durationMs, 1000, 3_600_000) && ok(r.errors, 0, 100_000) && ok(r.chars, 0, 100_000);
}
