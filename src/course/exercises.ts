import type { Lang } from "@/i18n/dict";
import { allowedChars, getLesson, lessonsFor } from "./lessons";

const MAX = 150;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
type Rand = () => number;
const pick = <T,>(xs: readonly T[], r: Rand) => xs[Math.floor(r() * xs.length)];

/** Join items with spaces up to the length budget. */
function fill(next: () => string, min = 45, max = MAX): string {
  let out = "";
  for (let guard = 0; guard < 200; guard++) {
    const w = next();
    const cand = out ? `${out} ${w}` : w;
    if (cand.length > max) { if (out.length >= min) break; continue; }
    out = cand;
    if (out.length >= max - 12) break;
  }
  return out;
}

function pseudoWord(letters: string[], must: string[], r: Rand) {
  const len = 3 + Math.floor(r() * 3);
  const w = Array.from({ length: len }, () => pick(letters, r));
  if (must.length) w[Math.floor(r() * len)] = pick(must, r);
  return w.join("");
}

function drill(fresh: string[], letters: string[], r: Rand) {
  const groups: string[] = [fresh.join("")];
  for (let i = 0; i < 14; i++) {
    const len = 2 + Math.floor(r() * 3);
    groups.push(Array.from({ length: len }, () => (r() < 0.8 ? pick(fresh, r) : pick(letters, r))).join(""));
  }
  let i = 0;
  return fill(() => groups[i++ % groups.length]);
}

function wordSource(words: string[], allowed: Set<string>, fresh: string[], r: Rand) {
  const fits = words.filter((w) => w.length >= 2 && [...w].every((c) => allowed.has(c)));
  const withFresh = fits.filter((w) => fresh.some((k) => w.includes(k)));
  const letters = [...allowed];
  // invented letter strings only while the learned keys still form too few real words
  const from = (pool: string[], must: string[]) => () => (pool.length >= 6 ? pick(pool, r) : pseudoWord(letters, must, r));
  return { fresh: from(withFresh, fresh), any: from(fits, []) };
}

const cap = (w: string) => w[0].toUpperCase() + w.slice(1);

/**
 * Three exercises for a lesson: new keys, words with them, mixed words.
 * Deterministic for (lesson, seed). Text lessons return [] (the page picks a passage).
 */
export function generateExercises(lang: Lang, lessonId: string, words: string[], seed: number): string[] {
  const lesson = getLesson(lang, lessonId);
  if (!lesson || lesson.kind === "text") return [];
  const r = rng(seed * 7919 + hash(lessonId));
  const allowed = allowedChars(lang, lessonId);
  const letters = [...allowed];

  if (lesson.kind === "letters") {
    const src = wordSource(words, allowed, lesson.keys, r);
    return [drill(lesson.keys, letters, r), fill(src.fresh), fill(src.any)];
  }

  const all = lessonsFor(lang).filter((l) => l.kind === "letters").flatMap((l) => l.keys);
  const src = wordSource(words, new Set(all), [], r);
  if (lesson.kind === "shift") {
    return [
      fill(() => { const c = pick(all, r); return c.toUpperCase() + c; }),
      fill(() => cap(src.any())),
      fill(() => (r() < 0.5 ? cap(src.any()) : src.any())),
    ];
  }
  if (lesson.kind === "punctuation") {
    let n = 0;
    const sentence = () => {
      const w = src.any();
      n++;
      return n % 5 === 0 ? `${w}.` : n % 3 === 0 ? `${w},` : w;
    };
    return [fill(() => `${src.any()},`), fill(() => `${cap(src.any())}.`), fill(sentence)];
  }
  // digits
  const num = () => String(Math.floor(r() * (r() < 0.5 ? 100 : 10000)));
  return [fill(() => Array.from({ length: 2 + Math.floor(r() * 3) }, () => pick(lesson.keys, r)).join("")), fill(num), fill(() => (r() < 0.4 ? num() : src.any()))];
}
