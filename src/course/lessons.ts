import type { Lang } from "@/i18n/dict";

export type LessonKind = "letters" | "shift" | "punctuation" | "digits" | "text";
export type LessonGroup = "home" | "top" | "bottom" | "extra";

export interface Lesson {
  id: string;
  index: number;
  kind: LessonKind;
  group: LessonGroup;
  /** new keys of this lesson (characters as typed) */
  keys: string[];
}

type Spec = [LessonKind, LessonGroup, string[]];

const RU: Spec[] = [
  ["letters", "home", ["а", "о"]], ["letters", "home", ["в", "л"]], ["letters", "home", ["ы", "д"]],
  ["letters", "home", ["ф", "ж"]], ["letters", "home", ["п", "р"]], ["letters", "home", ["э"]],
  ["letters", "top", ["е", "н"]], ["letters", "top", ["к", "г"]], ["letters", "top", ["у", "ш"]],
  ["letters", "top", ["ц", "щ"]], ["letters", "top", ["й", "з"]], ["letters", "top", ["х", "ъ"]],
  ["letters", "bottom", ["м", "т"]], ["letters", "bottom", ["и", "ь"]], ["letters", "bottom", ["с", "б"]],
  ["letters", "bottom", ["ч", "ю"]], ["letters", "bottom", ["я", "ё"]],
  ["shift", "extra", []], ["punctuation", "extra", [".", ","]], ["digits", "extra", [..."1234567890"]], ["text", "extra", []],
];

const EN: Spec[] = [
  ["letters", "home", ["f", "j"]], ["letters", "home", ["d", "k"]], ["letters", "home", ["s", "l"]],
  ["letters", "home", ["a"]], ["letters", "home", ["g", "h"]],
  ["letters", "top", ["e", "i"]], ["letters", "top", ["r", "u"]], ["letters", "top", ["t", "y"]],
  ["letters", "top", ["w", "o"]], ["letters", "top", ["q", "p"]],
  ["letters", "bottom", ["v", "m"]], ["letters", "bottom", ["c", "b"]], ["letters", "bottom", ["x", "n"]], ["letters", "bottom", ["z"]],
  ["shift", "extra", []], ["punctuation", "extra", [".", ","]], ["digits", "extra", [..."1234567890"]], ["text", "extra", []],
];

const build = (lang: Lang, specs: Spec[]): Lesson[] =>
  specs.map(([kind, group, keys], i) => ({ id: `${lang}-${String(i + 1).padStart(2, "0")}`, index: i, kind, group, keys }));

const LESSONS: Record<Lang, Lesson[]> = { ru: build("ru", RU), en: build("en", EN) };

export const lessonsFor = (lang: Lang) => LESSONS[lang];
export const getLesson = (lang: Lang, id: string) => LESSONS[lang].find((l) => l.id === id) ?? null;

/** Lower-case letters learned up to and including this lesson. */
export function allowedChars(lang: Lang, id: string): Set<string> {
  const out = new Set<string>();
  for (const l of LESSONS[lang]) {
    if (l.kind === "letters") l.keys.forEach((k) => out.add(k));
    if (l.id === id) break;
  }
  return out;
}
