/** Text clean-up for literary passages: everything must be typeable on a plain keyboard. */

export function normalizeLiterary(raw: string): string {
  return raw
    .normalize("NFC")
    .replace(/[́̀­​‌‍﻿]/g, "") // stress marks, soft hyphens, zero-width
    .replace(/[«»„“”‟″]/g, '"')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[—–―‒−]/g, "-")
    .replace(/…/g, "...")
    .replace(/[  -   　\t\r\n]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Pre-reform Russian spelling (ѣ, і, ѳ, ѵ, word-final ъ) is not what people type today. */
export function isModernOrthography(s: string): boolean {
  if (/[ѣѢіІѳѲѵѴ]/.test(s)) return false;
  return !/ъ(?=$|[\s.,!?;:"')-])/.test(s);
}

const SENTENCE_BREAK = /(?<=[.!?]"?)\s+(?=["A-ZА-ЯЁ])/;

/** Group whole sentences into passages of min..max characters. */
export function splitPassages(text: string, min = 150, max = 400): string[] {
  const sentences = text.split(SENTENCE_BREAK).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (s.length > max) { cur = ""; continue; }
    const next = cur ? `${cur} ${s}` : s;
    if (next.length > max) {
      if (cur.length >= min) out.push(cur);
      cur = s;
    } else {
      cur = next;
    }
    if (cur.length >= min) { out.push(cur); cur = ""; }
  }
  if (cur.length >= min) out.push(cur);
  return out.filter((p) => /^["A-ZА-ЯЁ]/.test(p) && /[.!?]"?$/.test(p));
}

const ALLOWED: Record<"ru" | "en", RegExp> = {
  ru: /^[а-яёА-ЯЁ0-9 .,!?;:"'()-]+$/,
  en: /^[A-Za-z0-9 .,!?;:"'()-]+$/,
};

/** Normalise paragraphs and cut them into passages that only use the language's own keyboard. */
export function passagesFrom(paragraphs: string[], lang: "ru" | "en"): string[] {
  const out: string[] = [];
  for (const para of paragraphs) {
    const text = normalizeLiterary(para);
    if (!text || text.startsWith("-")) continue;
    if (lang === "ru" && !isModernOrthography(text)) continue;
    for (const p of splitPassages(text)) {
      if (ALLOWED[lang].test(p) && !p.includes(" - -")) out.push(p);
    }
  }
  return out;
}

const ENTITIES: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", mdash: "—", ndash: "–", laquo: "«", raquo: "»", hellip: "…" };
const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

/** Paragraph texts from rendered MediaWiki HTML (tables, footnotes and markup removed). */
export function htmlParagraphs(html: string): string[] {
  const body = html
    .replace(/<(table|style|script|sup)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<span class="mw-editsection[\s\S]*?<\/span>/gi, "");
  const out: string[] = [];
  for (const m of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    const text = decode(m[1].replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
    if (text) out.push(text);
  }
  return out;
}

/** Paragraphs of a Project Gutenberg plain-text book, without its header and licence. */
export function gutenbergParagraphs(txt: string): string[] {
  const start = txt.search(/\*\*\* ?START OF (THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  const end = txt.search(/\*\*\* ?END OF (THE|THIS) PROJECT GUTENBERG/i);
  let body = txt.slice(start === -1 ? 0 : start, end === -1 ? undefined : end);
  if (start !== -1) body = body.slice(body.indexOf("\n") + 1);
  const paras = body
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  // skip prefaces and contents: the story starts at the first standalone "Chapter I" heading
  const first = paras.findIndex((p) => isFirstHeading(p.replace(/[[\]]/g, "").trim()));
  return (first >= 0 ? paras.slice(first + 1) : paras).filter((p) => !CHAPTER_REF.test(p) && !isContents(p));
}

const FIRST_CHAPTER = /^(chapter|book)\s+(i|1|one|the first)\b[.:]?(\s.{0,60})?$/i;
const FIRST_STORY = /^I\.\s+[A-Z][A-Z'’ -]{3,60}$/; // "I. A SCANDAL IN BOHEMIA"
const isFirstHeading = (p: string) => (FIRST_CHAPTER.test(p) && !/chapter/i.test(p.slice(8))) || FIRST_STORY.test(p);
const CHAPTER_REF = /\bCHAPTER [IVXLC]+\b/;
/** A run of three or more "IV. Title" items is a table of contents. */
const isContents = (p: string) => (p.match(/(^|\s)[IVXLC]+\.\s+[A-Z]/g) ?? []).length >= 3;
