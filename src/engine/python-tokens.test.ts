import { expect, test } from "vitest";
import { tokenizePython } from "./python-tokens";

const kinds = (src: string) => tokenizePython(src).map((t) => t.kind);

test("keywords, function names, builtins", () => {
  const src = "def foo(x): return len(x)";
  const k = kinds(src);
  expect(k[0]).toBe("kw");
  expect(k[src.indexOf("foo")]).toBe("fn");
  expect(k[src.indexOf("return")]).toBe("kw");
  expect(k[src.indexOf("len")]).toBe("bi");
});

test("triple-quoted string: quotes are delimiters, content is not", () => {
  const t = tokenizePython('"""x"""');
  expect(t.every((c) => c.kind === "str")).toBe(true);
  expect(t.map((c) => c.delimiter)).toEqual([true, true, true, false, true, true, true]);
});

test("comment and number", () => {
  expect(kinds("# c")).toEqual(["com", "com", "com"]);
  expect(kinds("12")).toEqual(["num", "num"]);
});

test("f-string prefix is str but not a delimiter", () => {
  const t = tokenizePython('f"a"');
  expect(t[0]).toEqual({ kind: "str", delimiter: false });
  expect(t[1].delimiter).toBe(true);
  expect(t[2].delimiter).toBe(false);
  expect(t[3].delimiter).toBe(true);
});

test("length matches source", () => {
  const src = "a = 'b'\n# c\n";
  expect(tokenizePython(src)).toHaveLength(src.length);
});
