import { expect, test } from "vitest";
import { codeView, createCodeState, isCodeComplete } from "./code";
import { tokenizePython } from "./python-tokens";
import { type, typeLikeHuman } from "./test-utils";

test("skipping optional spaces is not an error", () => {
  const s = type(createCodeState("x = 1"), "x=1");
  expect(s.buf).toBe("x = 1");
  expect(s.errors).toBe(0);
  expect(s.keys).toBe(3);
  expect(isCodeComplete(s)).toBe(true);
});

test("typing the optional spaces is fine too", () => {
  const s = type(createCodeState("f(a, b)"), "f(a, b)");
  expect(s.errors).toBe(0);
  expect(isCodeComplete(s)).toBe(true);
});

test("x = x + 1 is not x += 1", () => {
  const s = type(createCodeState("x += 1"), "x = x + 1");
  expect(isCodeComplete(s)).toBe(false);
  expect(s.errors).toBeGreaterThan(0);
});

test("single quotes accepted for a double-quoted string", () => {
  const s = type(createCodeState('a = "hi"'), "a = 'hi'");
  expect(s.errors).toBe(0);
  expect(isCodeComplete(s)).toBe(true);
});

test("quote inside string content must match", () => {
  const s = type(createCodeState(`a = "don't"`), `a = "don"t"`);
  expect(s.errors).toBeGreaterThan(0);
});

test("compact human typing of a whole snippet still completes", () => {
  const src = "def f(a, b):\n    return a + b * 2";
  const compact = "def f(a,b):\n    return a+b*2";
  const s = typeLikeHuman(createCodeState(src), compact);
  expect(isCodeComplete(s)).toBe(true);
  expect(s.errors).toBe(0);
});

test("codeView shows typed char with expected and ghosts at line end", () => {
  const s = type(createCodeState("print(ab)"), "print(ax");
  const [line] = codeView(s, tokenizePython(s.target));
  const err = line.marks.find((m) => m.status === "err")!;
  expect([err.ch, err.expected]).toEqual(["x", "b"]);
  expect(line.ghosts).toBe(")");
  expect(line.marks.filter((m) => m.caret)).toHaveLength(1);
  expect(line.current).toBe(true);
});

test("codeView marks wrong spaces with a visible glyph", () => {
  const s = type(createCodeState("ab"), "a ");
  const [line] = codeView(s, tokenizePython(s.target));
  expect(line.marks[1]).toMatchObject({ status: "err", ch: "␣", expected: "b" });
});

test("codeView caret at end of line gets its own slot", () => {
  const s = type(createCodeState("ab\ncd"), "ab");
  const [first, second] = codeView(s, tokenizePython(s.target));
  expect(first.marks.at(-1)).toMatchObject({ status: "todo", caret: true });
  expect(second.marks.every((m) => m.status === "todo" && !m.caret)).toBe(true);
});

test("codeView carries syntax kind on correct chars and flags extra lines", () => {
  const s = type(createCodeState("def"), "def\nz");
  const view = codeView(s, tokenizePython(s.target));
  expect(view[0].marks[0]).toMatchObject({ status: "ok", token: "kw" });
  expect(view[1].extra).toBe(true);
});
