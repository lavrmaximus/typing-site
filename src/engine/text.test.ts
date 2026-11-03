import { expect, test } from "vitest";
import { applyTextKey, createTextState, isTextComplete, textMarks, type TextState } from "./text";

const typeText = (s: TextState, t: string) => [...t].reduce((st, ch) => applyTextKey(st, { kind: "char", ch }), s);

test("text marks show typed vs expected", () => {
  const s = typeText(createTextState("на"), "ня");
  expect(textMarks(s)[1]).toMatchObject({ status: "err", ch: "я", expected: "а" });
  expect(s.errors).toBe(1);
});

test("wrong space shows a visible glyph", () => {
  const s = typeText(createTextState("ab c"), "abx");
  expect(textMarks(s)[2]).toMatchObject({ status: "err", ch: "x", expected: "␣" });
});

test("text input stops at end", () => {
  expect(typeText(createTextState("ab"), "abc").buf).toBe("ab");
});

test("caret mark and completion", () => {
  const s = typeText(createTextState("ab"), "a");
  expect(textMarks(s)[1].caret).toBe(true);
  expect(isTextComplete(s)).toBe(false);
  expect(isTextComplete(typeText(s, "b"))).toBe(true);
});

test("backspace and word backspace", () => {
  let s = typeText(createTextState("one two"), "one tw");
  s = applyTextKey(s, { kind: "backspace", word: true });
  expect(s.buf).toBe("one ");
  s = applyTextKey(s, { kind: "backspace", word: false });
  expect(s.buf).toBe("one");
});

test("enter and tab are ignored", () => {
  const s = applyTextKey(applyTextKey(createTextState("a"), { kind: "enter", ctrl: false }), { kind: "tab" });
  expect(s.buf).toBe("");
});

test("records which expected characters were missed", () => {
  const s = typeText(createTextState("аб в"), "ап_в");
  expect(s.missed).toEqual({ "б": 1, " ": 1 });
});
