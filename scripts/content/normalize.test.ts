import { expect, test } from "vitest";
import {
  gutenbergParagraphs,
  htmlParagraphs,
  isModernOrthography,
  normalizeLiterary,
  passagesFrom,
  splitPassages,
} from "./normalize";

test("normalizes typography", () => {
  expect(normalizeLiterary("«Да» — сказал он… ёж")).toBe('"Да" - сказал он... ёж');
  expect(normalizeLiterary("“Yes,” she said – ‘no’­")).toBe(`"Yes," she said - 'no'`);
  expect(normalizeLiterary("ударе́ние  и   пробелы")).toBe("ударение и пробелы");
});

test("rejects pre-reform orthography", () => {
  expect(isModernOrthography("Всѣ счастливыя семьи")).toBe(false);
  expect(isModernOrthography("съ нимъ")).toBe(false);
  expect(isModernOrthography("подъезд и объём")).toBe(true);
});

const SENT = (n: number) =>
  Array.from({ length: n }, (_, i) => `Это предложение номер ${"раз два три ".repeat(2)}и ещё немного слов ${i}.`).join(" ");

test("passages are whole sentences within bounds", () => {
  const out = splitPassages(SENT(30));
  expect(out.length).toBeGreaterThan(3);
  for (const p of out) {
    expect(p.length).toBeGreaterThanOrEqual(150);
    expect(p.length).toBeLessThanOrEqual(400);
    expect(p).toMatch(/^[A-ZА-ЯЁ"]/);
    expect(p).toMatch(/[.!?"]$/);
  }
});

test("dialogue lines and foreign letters are filtered per language", () => {
  const ru = passagesFrom(["- Здравствуйте, - сказал он. " + SENT(4), "Он сказал: bonjour. " + SENT(4), SENT(4)], "ru");
  expect(ru.every((p) => !/[A-Za-z]/.test(p) && !p.startsWith("-"))).toBe(true);
  expect(ru.length).toBeGreaterThan(0);
});

test("html paragraphs drop footnote markers and tags", () => {
  const html = '<div><p>Первый <i>абзац</i><sup class="reference"><a>[1]</a></sup> текста.</p><table><tr><td><p>шапка</p></td></tr></table><p>Второй&nbsp;абзац.</p></div>';
  expect(htmlParagraphs(html)).toEqual(["Первый абзац текста.", "Второй абзац."]);
});

test("gutenberg body is cut between markers and lines are unwrapped", () => {
  const txt = "Header\n*** START OF THE PROJECT GUTENBERG EBOOK X ***\n\nOne line\nwrapped here.\n\nSecond para.\n*** END OF THE PROJECT GUTENBERG EBOOK X ***\nLicense";
  expect(gutenbergParagraphs(txt)).toEqual(["One line wrapped here.", "Second para."]);
});
