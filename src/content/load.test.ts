import { expect, test } from "vitest";
import { LANGS } from "@/i18n/dict";
import { createCodeState, isCodeComplete } from "@/engine/code";
import { typeLikeHuman } from "@/engine/simulate";
import { getPassages, getSnippets, getWords, pickWords } from "./load";

test("content volumes", () => {
  expect(getSnippets().length).toBeGreaterThanOrEqual(100);
  for (const l of LANGS) {
    expect(getPassages(l).length).toBeGreaterThanOrEqual(60);
    expect(getWords(l)).toHaveLength(1000);
  }
});

test("every snippet passes the code engine with zero errors", () => {
  for (const sn of getSnippets()) {
    const s = typeLikeHuman(createCodeState(sn.code), sn.code);
    expect(isCodeComplete(s), sn.id).toBe(true);
    expect(s.errors, sn.id).toBe(0);
  }
});

test("ids are unique and sources are links", () => {
  const ids = [...getSnippets().map((s) => s.id), ...getPassages("ru").map((p) => p.id), ...getPassages("en").map((p) => p.id)];
  expect(new Set(ids).size).toBe(ids.length);
  for (const p of getPassages("ru")) expect(p.url).toMatch(/^https:\/\//);
});

test("words are lowercase letters of their own alphabet", () => {
  expect(getWords("ru").every((w) => /^[а-яё]{2,}$/.test(w))).toBe(true);
  expect(getWords("en").every((w) => /^[a-z]{2,}$/.test(w))).toBe(true);
});

test("pickWords returns exactly n words", () => {
  let i = 0;
  const rand = () => ((i = (i * 9301 + 49297) % 233280), i / 233280);
  for (const n of [25, 50, 100] as const) expect(pickWords("en", n, rand).split(" ")).toHaveLength(n);
});
