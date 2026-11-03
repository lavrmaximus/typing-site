import { expect, test } from "vitest";
import { applyCodeKey, codeCursor, createCodeState, isCodeComplete } from "./code";
import { PROTOTYPE_SNIPPETS, type } from "./test-utils";
import { typeLikeHuman } from "./simulate";

const BS = { kind: "backspace", word: false } as const;

test("auto-pairs brackets and overtypes closer", () => {
  let s = type(createCodeState("f(x)"), "f(");
  expect([s.buf, s.pending]).toEqual(["f(", ")"]);
  s = type(s, "x)");
  expect([s.buf, s.pending]).toEqual(["f(x)", ""]);
});

test("quote not paired after word char or inside string", () => {
  expect(type(createCodeState(""), 'f"').pending).toBe("");
  expect(type(createCodeState(""), 'print(f"{a}').pending).toBe(")");
  expect(type(createCodeState(""), 'print(f"{a}"').pending).toBe(")");
});

test("triple quotes", () => {
  const s = type(createCodeState(""), '"""doc"""');
  expect([s.buf, s.pending]).toEqual(['"""doc"""', ""]);
});

test("enter indents, deeper after colon, strips blank line", () => {
  let s = type(createCodeState(""), "def f():\nx\n");
  expect(s.buf).toBe("def f():\n    x\n    ");
  s = applyCodeKey(s, { kind: "enter", ctrl: false });
  expect(s.buf).toBe("def f():\n    x\n\n    ");
});

test("ctrl+enter commits pending closers", () => {
  let s = type(createCodeState(""), "print(f(a");
  s = applyCodeKey(s, { kind: "enter", ctrl: true });
  expect([s.buf, s.pending]).toEqual(["print(f(a))\n", ""]);
});

test("end commits pending closers of the line", () => {
  const s = applyCodeKey(type(createCodeState(""), "g([1"), { kind: "end" });
  expect([s.buf, s.pending]).toEqual(["g([1])", ""]);
});

test("backspace removes indent to previous multiple of 4", () => {
  let s = type(createCodeState(""), "if a:\n");
  expect(s.buf).toBe("if a:\n    ");
  s = applyCodeKey(s, BS);
  expect(s.buf).toBe("if a:\n");
});

test("backspace after opener removes its auto pair", () => {
  const s = applyCodeKey(type(createCodeState(""), "("), BS);
  expect([s.buf, s.pending]).toEqual(["", ""]);
});

test("backspace at line start keeps pending", () => {
  let s = type(createCodeState(""), "f(\n");
  expect([s.buf, s.pending]).toEqual(["f(\n", ")"]);
  s = applyCodeKey(s, BS);
  expect([s.buf, s.pending]).toEqual(["f(", ")"]);
});

test("ctrl+backspace deletes a word", () => {
  const s = applyCodeKey(type(createCodeState(""), "x = value"), { kind: "backspace", word: true });
  expect(s.buf).toBe("x = ");
});

test("tab pads to next multiple of 4", () => {
  const s = applyCodeKey(type(createCodeState(""), "ab"), { kind: "tab" });
  expect(s.buf).toBe("ab  ");
});

test("counts keys and errors against the sample", () => {
  const s = type(createCodeState("abc"), "axc");
  expect(s.keys).toBe(3);
  expect(s.errors).toBe(1);
});

test("enter beyond the last sample line is an error", () => {
  const s = type(createCodeState("a"), "a\n");
  expect(s.errors).toBe(1);
});

test("cursor position", () => {
  expect(codeCursor(type(createCodeState(""), "ab\ncd"))).toEqual({ line: 1, col: 2 });
});

test("state is not mutated", () => {
  const s0 = createCodeState("x");
  const s1 = applyCodeKey(s0, { kind: "char", ch: "x" });
  expect(s0.buf).toBe("");
  expect(s1).not.toBe(s0);
});

test("whole prototype snippets complete with zero errors", () => {
  for (const src of PROTOTYPE_SNIPPETS) {
    const s = typeLikeHuman(createCodeState(src), src);
    expect(isCodeComplete(s)).toBe(true);
    expect(s.errors).toBe(0);
  }
});

test("incomplete is not complete", () => {
  expect(isCodeComplete(type(createCodeState("ab"), "a"))).toBe(false);
});

test("other quote inside a string is not paired", () => {
  const s = type(createCodeState(""), 'x = "say \'');
  expect(s.pending).toBe('"');
});

test("quotes inside comments are not paired", () => {
  const s = type(createCodeState(""), "# '");
  expect(s.pending).toBe("");
});

test("human typing handles deeper continuation indent", () => {
  const src = "x = f(\n    1,\n)";
  const s = typeLikeHuman(createCodeState(src), src);
  expect(isCodeComplete(s)).toBe(true);
  expect(s.errors).toBe(0);
});

test("brackets inside strings and comments are not auto-closed", () => {
  expect(type(createCodeState(""), 'x = "(').pending).toBe('"');
  expect(type(createCodeState(""), "# see (").pending).toBe("");
});

test("ctrl+backspace also removes the auto-pairs of deleted openers", () => {
  let s = type(createCodeState("f(x)"), "f(");
  s = applyCodeKey(s, { kind: "backspace", word: true });
  s = applyCodeKey(s, { kind: "backspace", word: true });
  expect([s.buf, s.pending]).toEqual(["", ""]);
  s = type(createCodeState("f(x)"), "f(");
  s = applyCodeKey(s, { kind: "backspace", word: true });
  s = type(s, "(x)");
  expect(isCodeComplete(s)).toBe(true);
  s = type(createCodeState('print("a")'), 'print("');
  s = applyCodeKey(s, { kind: "backspace", word: true });
  expect(s.pending).toBe(")");
});

test("records missed sample characters", () => {
  const s = type(createCodeState("ab\ncd"), "xb\ncz");
  expect(s.missed).toEqual({ a: 1, d: 1 });
});
