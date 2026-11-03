import { RESULT_MODES, type Result, type ResultMode } from "./types";

export interface ModeStats { count: number; bestCpm: number; avgCpm: number }
export interface LessonStats { stars: number; bestCpm: number; attempts: number }
export interface Summary {
  count: number;
  totalMs: number;
  bestCpm: number;
  /** mean speed of the last 10 results */
  avgCpm: number;
  /** mean accuracy of the last 10 results */
  avgAccuracy: number;
  /** last 50 results, oldest first */
  series: Array<Pick<Result, "at" | "cpm" | "accuracy" | "mode">>;
  byMode: Record<ResultMode, ModeStats>;
  missed: Record<string, number>;
  missedTop: Array<{ ch: string; count: number }>;
  lessons: Record<string, LessonStats>;
}

const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

export function summarize(results: Result[]): Summary {
  const byTime = [...results].sort((a, b) => a.at - b.at);
  const last10 = byTime.slice(-10);
  const missed: Record<string, number> = {};
  const lessons: Record<string, LessonStats> = {};
  for (const r of byTime) {
    for (const [ch, n] of Object.entries(r.missed ?? {})) missed[ch] = (missed[ch] ?? 0) + n;
    if (r.mode === "lesson" && r.lessonId) {
      const l = lessons[r.lessonId] ?? { stars: 0, bestCpm: 0, attempts: 0 };
      lessons[r.lessonId] = { stars: Math.max(l.stars, r.stars ?? 0), bestCpm: Math.max(l.bestCpm, r.cpm), attempts: l.attempts + 1 };
    }
  }
  const byMode = Object.fromEntries(
    RESULT_MODES.map((m) => {
      const xs = byTime.filter((r) => r.mode === m).map((r) => r.cpm);
      return [m, { count: xs.length, bestCpm: xs.length ? Math.max(...xs) : 0, avgCpm: mean(xs) }];
    }),
  ) as Record<ResultMode, ModeStats>;
  return {
    count: results.length,
    totalMs: results.reduce((a, r) => a + r.durationMs, 0),
    bestCpm: results.length ? Math.max(...results.map((r) => r.cpm)) : 0,
    avgCpm: mean(last10.map((r) => r.cpm)),
    avgAccuracy: mean(last10.map((r) => r.accuracy)),
    series: byTime.slice(-50).map(({ at, cpm, accuracy, mode }) => ({ at, cpm, accuracy, mode })),
    byMode,
    missed,
    missedTop: Object.entries(missed).map(([ch, count]) => ({ ch, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    lessons,
  };
}
