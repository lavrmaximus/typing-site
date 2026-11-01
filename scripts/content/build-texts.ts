/**
 * Builds content/texts.{ru,en}.json from public-domain classics.
 * RU: ru.wikisource.org (modern-orthography editions only). EN: Project Gutenberg.
 * Run: npm run content:texts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { gutenbergParagraphs, htmlParagraphs, passagesFrom } from "./normalize";

interface Work { author: string; work: string; source: string }
interface Passage { id: string; text: string; author: string; work: string; url: string }

const PER_WORK = 14;

const RU: Work[] = [
  { author: "А. П. Чехов", work: "Дама с собачкой", source: "Дама с собачкой (Чехов)" },
  { author: "И. С. Тургенев", work: "Муму", source: "Муму (Тургенев)" },
  { author: "Н. В. Гоголь", work: "Шинель", source: "Шинель (Гоголь)/СС 1967 (СО)" },
  { author: "А. С. Пушкин", work: "Капитанская дочка", source: "Капитанская дочка (Пушкин)" },
  { author: "А. С. Пушкин", work: "Станционный смотритель", source: "Повести покойного Ивана Петровича Белкина (Пушкин)/Станционный смотритель" },
  { author: "Л. Н. Толстой", work: "Анна Каренина", source: "Анна Каренина (Толстой)" },
  { author: "И. С. Тургенев", work: "Отцы и дети", source: "Отцы и дети (Тургенев)" },
  { author: "А. П. Чехов", work: "Палата № 6", source: "Палата № 6 (Чехов)" },
  { author: "А. П. Чехов", work: "Человек в футляре", source: "Человек в футляре (Чехов)" },
];

const EN: Array<Work & { id: number }> = [
  { author: "Jane Austen", work: "Pride and Prejudice", source: "", id: 1342 },
  { author: "Charles Dickens", work: "A Tale of Two Cities", source: "", id: 98 },
  { author: "Lewis Carroll", work: "Alice's Adventures in Wonderland", source: "", id: 11 },
  { author: "Arthur Conan Doyle", work: "The Adventures of Sherlock Holmes", source: "", id: 1661 },
  { author: "Mary Shelley", work: "Frankenstein", source: "", id: 84 },
  { author: "Mark Twain", work: "The Adventures of Tom Sawyer", source: "", id: 74 },
  { author: "Jack London", work: "The Call of the Wild", source: "", id: 215 },
];

const WS = "https://ru.wikisource.org";
const wikiUrl = (title: string) => `${WS}/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

async function get(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": "ritm-content-builder/1.0" } });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }
}

const render = (title: string) => get(`${WS}/w/index.php?title=${encodeURIComponent(title)}&action=render`);

function links(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/href="(?:https?:\/\/ru\.wikisource\.org)?\/wiki\/([^"#?]+)"/g)) {
    const t = decodeURIComponent(m[1]).replace(/_/g, " ");
    if (!t.includes(":") && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Follow redaction lists (prefer modern "(СО)" editions) and chapter subpages until there is real text. */
async function wikiParagraphs(title: string, depth = 0): Promise<string[]> {
  const html = await render(title);
  const paras = htmlParagraphs(html);
  if (paras.join(" ").length > 4000 || depth >= 2) return paras;
  const all = links(html);
  const modern = all.filter((t) => t.includes("(СО)"));
  const base = title.split("/")[0];
  const sub = all.filter((t) => t.startsWith(base + "/") && t !== title);
  const next = modern.length ? [modern[modern.length - 1]] : sub.slice(0, 10);
  const out = [...paras];
  for (const t of next) out.push(...(await wikiParagraphs(t, depth + 1)));
  return out;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "");

function pick<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  return Array.from({ length: n }, (_, i) => items[Math.floor((i * items.length) / n)]);
}

async function main() {
  mkdirSync("content", { recursive: true });
  const ru: Passage[] = [];
  for (const w of RU) {
    try {
      const passages = pick(passagesFrom(await wikiParagraphs(w.source), "ru"), PER_WORK);
      passages.forEach((text, i) => ru.push({ id: `${slug(w.work)}-${i + 1}`, text, author: w.author, work: w.work, url: wikiUrl(w.source) }));
      console.log(`ru ${w.work}: ${passages.length}`);
    } catch (e) {
      console.warn(`ru ${w.work}: skipped (${(e as Error).message})`);
    }
  }
  const en: Passage[] = [];
  for (const w of EN) {
    const url = `https://www.gutenberg.org/ebooks/${w.id}`;
    try {
      const txt = await get(`https://www.gutenberg.org/cache/epub/${w.id}/pg${w.id}.txt`);
      const passages = pick(passagesFrom(gutenbergParagraphs(txt), "en"), PER_WORK);
      passages.forEach((text, i) => en.push({ id: `${slug(w.work)}-${i + 1}`, text, author: w.author, work: w.work, url }));
      console.log(`en ${w.work}: ${passages.length}`);
    } catch (e) {
      console.warn(`en ${w.work}: skipped (${(e as Error).message})`);
    }
  }
  writeFileSync("content/texts.ru.json", JSON.stringify(ru, null, 1) + "\n");
  writeFileSync("content/texts.en.json", JSON.stringify(en, null, 1) + "\n");
  console.log(`total ru=${ru.length} en=${en.length}`);
}

main();
