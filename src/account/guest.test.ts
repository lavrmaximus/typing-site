import { expect, test } from "vitest";
import { GUEST_KEY, GUEST_LIMIT, clearGuest, pushGuest, readGuest } from "./guest";
import type { Result } from "./types";

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
}

const r = (at: number): Result => ({ at, mode: "words", lang: "en", cpm: 100, accuracy: 100, errors: 0, durationMs: 1000, chars: 10, missed: {} });

test("guest results are kept in order and capped to the newest", () => {
  const st = new MemoryStorage();
  for (let i = 0; i < GUEST_LIMIT + 5; i++) pushGuest(r(i), st);
  const all = readGuest(st);
  expect(all).toHaveLength(GUEST_LIMIT);
  expect(all[0].at).toBe(5);
  clearGuest(st);
  expect(readGuest(st)).toEqual([]);
});

test("corrupt or missing storage reads as empty", () => {
  const st = new MemoryStorage();
  st.setItem(GUEST_KEY, "{not json");
  expect(readGuest(st)).toEqual([]);
  expect(readGuest(null)).toEqual([]);
});
