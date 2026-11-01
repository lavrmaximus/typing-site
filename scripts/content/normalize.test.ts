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

test("gutenberg front matter and tables of contents are skipped", () => {
  const txt = [
    "*** START OF THE PROJECT GUTENBERG EBOOK X ***",
    "",
    "PREFACE.",
    "",
    "Walt Whitman has somewhere a fine and just distinction between loving by allowance and loving with personal love.",
    "",
    "Contents",
    "",
    "CHAPTER I. Down the Rabbit-Hole CHAPTER II. The Pool of Tears",
    "",
    "CHAPTER I.",
    "",
    "Real story text starts here.",
    "",
    "*** END OF THE PROJECT GUTENBERG EBOOK X ***",
  ].join("\n");
  expect(gutenbergParagraphs(txt)).toEqual(["Real story text starts here."]);
});

test("other first-chapter heading styles and roman-numeral contents", () => {
  const book = (heading: string) =>
    ["*** START OF THE PROJECT GUTENBERG EBOOK X ***", "Preface text that should go.", "Contents", "I. A Scandal in Bohemia II. The Red-Headed League III. A Case of Identity", heading, "Story.", "*** END OF THE PROJECT GUTENBERG EBOOK X ***"].join("\n\n");
  expect(gutenbergParagraphs(book("Chapter I.]"))).toEqual(["Story."]);
  expect(gutenbergParagraphs(book("I. A SCANDAL IN BOHEMIA"))).toEqual(["Story."]);
});
