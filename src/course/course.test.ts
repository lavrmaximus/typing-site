import { expect, test } from "vitest";
import { getWords } from "@/content/load";
import { LANGS } from "@/i18n/dict";
import { allowedChars, getLesson, lessonsFor } from "./lessons";
import { generateExercises } from "./exercises";
import { gradeLesson, targetCpm } from "./grading";
import { fingerFor, keyFor } from "./layout";

test("each language has a full course with unique ids", () => {
  for (const lang of LANGS) {
    const ls = lessonsFor(lang);
    expect(ls.length).toBeGreaterThanOrEqual(18);
    expect(new Set(ls.map((l) => l.id)).size).toBe(ls.length);
    expect(ls[0].keys.length).toBeGreaterThan(0);
    expect(ls.at(-1)!.kind).toBe("text");
  }
  expect(getLesson("ru", "ru-01")?.keys).toEqual(["а", "о"]);
  expect(getLesson("en", "en-01")?.keys).toEqual(["f", "j"]);
});

test("allowed characters grow lesson by lesson", () => {
  const ls = lessonsFor("ru");
  expect([...allowedChars("ru", ls[1].id)].sort()).toEqual(["а", "в", "л", "о"]);
  expect(allowedChars("ru", ls[5].id).size).toBeGreaterThan(allowedChars("ru", ls[4].id).size);
});

test("letter lessons only use keys learned so far and practise the new ones", () => {
  for (const lang of LANGS) {
    const words = getWords(lang);
    for (const lesson of lessonsFor(lang).filter((l) => l.kind === "letters")) {
      const allowed = allowedChars(lang, lesson.id);
      const ex = generateExercises(lang, lesson.id, words, 7);
      expect(ex, lesson.id).toHaveLength(3);
      for (const text of ex) {
        expect(text.length, lesson.id).toBeGreaterThanOrEqual(30);
        expect(text.length, lesson.id).toBeLessThanOrEqual(160);
        for (const ch of text) expect(ch === " " || allowed.has(ch), `${lesson.id}: ${ch} in "${text}"`).toBe(true);
      }
      for (const k of lesson.keys) expect(ex[0] + ex[1], `${lesson.id} practises ${k}`).toContain(k);
    }
  }
});

test("shift, punctuation and digit lessons contain what they teach", () => {
  const caps = lessonsFor("ru").find((l) => l.kind === "shift")!;
  expect(generateExercises("ru", caps.id, getWords("ru"), 1).join(" ")).toMatch(/[А-ЯЁ]/);
  const punct = lessonsFor("en").find((l) => l.kind === "punctuation")!;
  expect(generateExercises("en", punct.id, getWords("en"), 1).join(" ")).toMatch(/[,.]/);
  const digits = lessonsFor("en").find((l) => l.kind === "digits")!;
  expect(generateExercises("en", digits.id, getWords("en"), 1).join(" ")).toMatch(/\d/);
});

test("exercises are reproducible for the same seed and differ for another", () => {
  const w = getWords("ru");
  expect(generateExercises("ru", "ru-07", w, 3)).toEqual(generateExercises("ru", "ru-07", w, 3));
  expect(generateExercises("ru", "ru-07", w, 3)).not.toEqual(generateExercises("ru", "ru-07", w, 4));
});

test("target speed grows and grading gives stars", () => {
  expect(targetCpm(0)).toBe(60);
  expect(targetCpm(5)).toBe(100);
  expect(targetCpm(40)).toBe(250);
  expect(gradeLesson(93, 200, 60)).toBe(0);
  expect(gradeLesson(95, 50, 60)).toBe(0);
  expect(gradeLesson(95, 60, 60)).toBe(1);
  expect(gradeLesson(97, 60, 60)).toBe(2);
  expect(gradeLesson(99, 78, 60)).toBe(3);
  expect(gradeLesson(99, 70, 60)).toBe(2);
});

test("finger and key for characters", () => {
  expect(fingerFor("а")).toBe(3); // left index
  expect(fingerFor("о")).toBe(4); // right index
  expect(fingerFor("f")).toBe(3);
  expect(fingerFor("A")).toBe(0); // left pinky (shift is the other hand)
  expect(keyFor("Ф")).toEqual({ id: "a", shift: true });
  expect(keyFor(",")?.id).toBe(",");
  expect(keyFor("1")?.id).toBe("1");
});
