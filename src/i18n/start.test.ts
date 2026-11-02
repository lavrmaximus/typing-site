import { expect, test } from "vitest";
import { langFromLanguages, startPath } from "./start";

test("browser languages pick the site language", () => {
  expect(langFromLanguages(["ru-RU", "en"])).toBe("ru");
  expect(langFromLanguages(["uk"])).toBe("ru");
  expect(langFromLanguages(["en-US"])).toBe("en");
  expect(langFromLanguages(["de-DE"])).toBe("en");
  expect(langFromLanguages([])).toBe("ru");
});

test("root goes to the remembered page, else by browser language", () => {
  expect(startPath(null, "/en/text", ["ru-RU"])).toBe("/en/text");
  expect(startPath(null, null, ["en-US"])).toBe("/en/code");
  expect(startPath(null, "/xx/evil", ["ru"])).toBe("/ru/code");
});

test("/ru and /en keep their language and reuse the remembered mode only in that language", () => {
  expect(startPath("ru", "/ru/text", ["en"])).toBe("/ru/text");
  expect(startPath("ru", "/en/text", ["en"])).toBe("/ru/code");
  expect(startPath("en", null, ["ru"])).toBe("/en/code");
});
