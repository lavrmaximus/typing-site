import { expect, test } from "vitest";
import { charsMatch, isOptionalSpace } from "./leniency";
import { tokenizePython } from "./python-tokens";

test("spaces around operators and after commas are optional", () => {
  const l = "x = a + 1, f(y)";
  const t = tokenizePython(l);
  expect(isOptionalSpace(l, 1, t)).toBe(true); // before =
  expect(isOptionalSpace(l, 10, t)).toBe(true); // after ,
});

test("space between words is required", () => {
  const l = "return mid";
  expect(isOptionalSpace(l, 6, tokenizePython(l))).toBe(false);
});

test("space inside a string or comment is required", () => {
  const l = 'a = "b c"  # x y';
  const t = tokenizePython(l);
  expect(isOptionalSpace(l, 6, t)).toBe(false);
  expect(isOptionalSpace(l, 13, t)).toBe(false);
});

test("indentation is never optional", () => {
  const l = "    x = 1";
  expect(isOptionalSpace(l, 0, tokenizePython(l))).toBe(false);
});

test("quotes are interchangeable only as delimiters", () => {
  expect(charsMatch("'", '"', true)).toBe(true);
  expect(charsMatch("'", '"', false)).toBe(false);
  expect(charsMatch("a", "a", false)).toBe(true);
  expect(charsMatch("a", "b", true)).toBe(false);
});
