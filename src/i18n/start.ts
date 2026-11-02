import type { Lang } from "./dict";

export const LAST_PATH_KEY = "ritm.last";
const REMEMBERED = /^\/(ru|en)\/(code|text)$/;

/** Russian for ru/uk/be/kk browsers, English for any other language. */
export function langFromLanguages(languages: readonly string[]): Lang {
  const first = languages[0]?.toLowerCase();
  if (!first) return "ru";
  return /^(ru|uk|be|kk)\b/.test(first) ? "ru" : "en";
}

/**
 * Where "/" (lang = null) or "/ru", "/en" should land: the remembered page when
 * it fits, otherwise the code page in the browser's (or the given) language.
 */
export function startPath(lang: Lang | null, remembered: string | null, languages: readonly string[]): string {
  const last = remembered && REMEMBERED.test(remembered) ? remembered : null;
  if (lang) return last?.startsWith(`/${lang}/`) ? last : `/${lang}/code`;
  return last ?? `/${langFromLanguages(languages)}/code`;
}
