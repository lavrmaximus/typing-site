import { expect, test } from "vitest";
import { phoneView } from "./phone";

test("wrong committed word keeps sample, exposes typed word", () => {
  const v = phoneView("что на", "чтобы ");
  expect(v.marks[0]).toMatchObject({ status: "err", ch: "ч", typedWord: "чтобы" });
  expect(v.wrongWords).toBe(1);
  expect(v.committed).toBe(1);
});

test("current word compared letter by letter with caret after it", () => {
  const v = phoneView("лицо", "лиц");
  expect(v.marks.slice(0, 3).every((m) => m.status === "ok")).toBe(true);
  expect(v.marks[3]).toMatchObject({ status: "todo", caret: true });
});

test("done when last word matches without trailing space", () => {
  expect(phoneView("a b", "a b").done).toBe(true);
  expect(phoneView("a b", "a").done).toBe(false);
});

test("re-evaluates earlier word edits", () => {
  expect(phoneView("что на", "чтл на").wrongWords).toBe(1);
  expect(phoneView("что на", "что на").wrongWords).toBe(0);
});

test("leading and repeated spaces from keyboards are ignored", () => {
  const v = phoneView("a b c", " a  b ");
  expect(v.committed).toBe(2);
  expect(v.wrongWords).toBe(0);
});

test("correct chars count words plus their spaces", () => {
  expect(phoneView("ab cd", "ab c").correctChars).toBe(4);
});
