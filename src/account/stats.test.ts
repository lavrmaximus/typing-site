import { expect, test } from "vitest";
import { summarize } from "./stats";
import type { Result } from "./types";

const r = (over: Partial<Result>): Result => ({
  at: 1, mode: "lit", lang: "ru", cpm: 200, accuracy: 95, errors: 2, durationMs: 30_000, chars: 100, missed: {}, ...over,
});

test("empty history", () => {
  const s = summarize([]);
  expect(s.count).toBe(0);
  expect(s.bestCpm).toBe(0);
  expect(s.series).toEqual([]);
});

test("totals, best and recent averages", () => {
  const results = Array.from({ length: 12 }, (_, i) => r({ at: i, cpm: 100 + i * 10, accuracy: 90 + (i % 2) * 10 }));
  const s = summarize(results);
  expect(s.count).toBe(12);
  expect(s.totalMs).toBe(12 * 30_000);
  expect(s.bestCpm).toBe(210);
  // last ten by time: cpm 120..210
  expect(s.avgCpm).toBe(165);
  expect(s.avgAccuracy).toBe(95);
  expect(s.series.map((p) => p.at)).toEqual([...Array(12).keys()]);
});

test("breakdown by mode", () => {
  const s = summarize([r({ mode: "code", cpm: 150 }), r({ mode: "code", cpm: 250 }), r({ mode: "words", cpm: 300 })]);
  expect(s.byMode.code).toEqual({ count: 2, bestCpm: 250, avgCpm: 200 });
  expect(s.byMode.words.count).toBe(1);
  expect(s.byMode.lit.count).toBe(0);
});

test("missed characters are added up and ranked", () => {
  const s = summarize([r({ missed: { о: 2, " ": 1 } }), r({ missed: { о: 1, ж: 5 } })]);
  expect(s.missed).toEqual({ о: 3, " ": 1, ж: 5 });
  expect(s.missedTop.map((m) => m.ch)).toEqual(["ж", "о", " "]);
});

test("course progress keeps the best attempt per lesson", () => {
  const s = summarize([
    r({ mode: "lesson", lessonId: "ru-01", stars: 1, cpm: 90 }),
    r({ mode: "lesson", lessonId: "ru-01", stars: 3, cpm: 80 }),
    r({ mode: "lesson", lessonId: "ru-02", stars: 0, cpm: 40 }),
  ]);
  expect(s.lessons["ru-01"]).toEqual({ stars: 3, bestCpm: 90, attempts: 2 });
  expect(s.lessons["ru-02"].stars).toBe(0);
});
