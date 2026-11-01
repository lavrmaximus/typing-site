import { expect, test } from "vitest";
import { accuracy, codeCorrectChars, glowHue, glowStrength, speed, textCorrectChars } from "./metrics";
import { createCodeState } from "./code";
import { createTextState } from "./text";
import { type } from "./test-utils";

test("speed in cpm and wpm", () => {
  expect(speed(500, 60_000, "cpm")).toBe(500);
  expect(speed(500, 60_000, "wpm")).toBe(100);
  expect(speed(10, 200, "cpm")).toBe(600); // below 1 s the denominator is 1 s
});

test("accuracy", () => {
  expect(accuracy(0, 0)).toBe(100);
  expect(accuracy(10, 1)).toBe(90);
  expect(accuracy(2, 5)).toBe(0);
});

test("glow hue and strength", () => {
  expect(glowHue(100)).toBe(205);
  expect(glowHue(500)).toBe(25);
  expect(glowHue(325)).toBe(115);
  expect(glowStrength(150)).toBeCloseTo(0.18);
  expect(glowStrength(900)).toBeCloseTo(0.53);
});

test("correct chars", () => {
  expect(textCorrectChars({ ...createTextState("abc"), buf: "axc" })).toBe(2);
  expect(codeCorrectChars(type(createCodeState("ab\ncd"), "ab\nc"))).toBe(4);
});
