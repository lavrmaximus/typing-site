import snippets from "../../content/snippets.json";
import textsRu from "../../content/texts.ru.json";
import textsEn from "../../content/texts.en.json";
import wordsRu from "../../content/words.ru.json";
import wordsEn from "../../content/words.en.json";
import type { Lang } from "@/i18n/dict";

export interface Snippet { id: string; path: string; url: string; code: string }
export interface Passage { id: string; text: string; author: string; work: string; url: string }
export type WordCount = 25 | 50 | 100;

const PASSAGES: Record<Lang, Passage[]> = { ru: textsRu, en: textsEn };
const WORDS: Record<Lang, string[]> = { ru: wordsRu, en: wordsEn };

export const getSnippets = (): Snippet[] => snippets;
export const getPassages = (lang: Lang): Passage[] => PASSAGES[lang];
export const getWords = (lang: Lang): string[] => WORDS[lang];

/** n distinct random words from the frequency list, space-separated. */
export function pickWords(lang: Lang, n: WordCount, rand: () => number = Math.random): string {
  const pool = [...WORDS[lang]];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).join(" ");
}
