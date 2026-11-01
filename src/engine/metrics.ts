import { codeCursor, type CodeState } from "./code";
import type { TextState } from "./text";

export type SpeedUnit = "cpm" | "wpm";

export function speed(correctChars: number, ms: number, unit: SpeedUnit): number {
  const minutes = Math.max(ms, 1000) / 60_000;
  const cpm = correctChars / minutes;
  return Math.round(unit === "wpm" ? cpm / 5 : cpm);
}

export function accuracy(keys: number, errors: number): number {
  if (keys === 0) return 100;
  return Math.max(0, Math.round(((keys - errors) / keys) * 100));
}

const SLOW = 150;
const FAST = 500;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const fastness = (cpm: number) => clamp01((cpm - SLOW) / (FAST - SLOW));

/** Backlight hue: cold blue (205) when slow, warm orange (25) when fast. */
export const glowHue = (cpm: number) => Math.round(205 - fastness(cpm) * 180);
export const glowStrength = (cpm: number) => 0.18 + fastness(cpm) * 0.35;

export function textCorrectChars(s: TextState): number {
  let n = 0;
  for (let i = 0; i < s.buf.length; i++) if (s.buf[i] === s.target[i]) n++;
  return n;
}

/** Correct chars on typed lines, plus one per finished line break. */
export function codeCorrectChars(s: CodeState): number {
  const typed = s.buf.split("\n");
  const sample = s.target.split("\n");
  const { line } = codeCursor(s);
  let n = 0;
  typed.forEach((l, k) => {
    const want = sample[k] ?? "";
    for (let j = 0; j < l.length; j++) if (l[j] === want[j]) n++;
    if (k < line) n++;
  });
  return n;
}
