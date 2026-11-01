import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

export interface Snippet { id: string; code: string }
export const snippets: Snippet[] = JSON.parse(readFileSync("content/snippets.json", "utf8"));

/** A 10–15 line snippet without tricky quotes, for stable tests. */
export const shortSnippet = snippets.find((s) => {
  const n = s.code.split("\n").length;
  return n >= 10 && n <= 15 && !/["']/.test(s.code);
})!;

/** Type like a person in an editor: Backspace to the wanted indent, type the stripped line, Enter. */
export async function typeLikeHuman(page: Page, code: string) {
  let indent = 0;
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const want = line.match(/^ */)![0].length;
    if (line.trim()) {
      while (indent > want) {
        await page.keyboard.press("Backspace");
        indent -= indent % 4 || 4;
      }
      if (want > indent) await page.keyboard.type(" ".repeat(want - indent));
      await page.keyboard.type(line.trim());
    }
    if (i < lines.length - 1) {
      await page.keyboard.press("Enter");
      if (line.trim()) indent = want + (line.trimEnd().endsWith(":") ? 4 : 0);
    }
  }
}

export interface Passage { id: string; text: string }
export const passagesRu: Passage[] = JSON.parse(readFileSync("content/texts.ru.json", "utf8"));
export const passagesEn: Passage[] = JSON.parse(readFileSync("content/texts.en.json", "utf8"));
