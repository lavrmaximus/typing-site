import { expect, test } from "vitest";
import { isPlausible } from "./plausible";
import type { Result } from "./types";

const r: Result = { at: 1, mode: "lit", lang: "ru", cpm: 300, accuracy: 97, errors: 1, durationMs: 30_000, chars: 150, missed: {} };

test("human results pass, pasted or broken ones do not", () => {
  expect(isPlausible(r)).toBe(true);
  expect(isPlausible({ ...r, cpm: 2500 })).toBe(false);
  expect(isPlausible({ ...r, durationMs: 200 })).toBe(false);
  expect(isPlausible({ ...r, accuracy: 101 })).toBe(false);
  expect(isPlausible({ ...r, cpm: Number.NaN })).toBe(false);
});
