export type Lang = "ru" | "en";
export const LANGS: Lang[] = ["ru", "en"];

export const isLang = (v: string): v is Lang => (LANGS as string[]).includes(v);

/** Pick the site language from an Accept-Language header. */
export function langFromAcceptLanguage(header: string | null): Lang {
  if (!header) return "ru";
  const first = header.split(",")[0]?.trim().toLowerCase() ?? "";
  if (/^(ru|uk|be|kk)\b/.test(first)) return "ru";
  return first ? "en" : "ru";
}

const ru = {
  title: "ритм — тренажёр скорости печати",
  description: "Тест скорости печати и тренировка для программистов: перепечатывайте настоящий код на Python с поведением редактора.",
  navCode: "Код",
  navText: "Текст",
  langSwitch: "Язык",
  themeToLight: "Светлая тема",
  themeToDark: "Тёмная тема",
  unit: "зн/мин",
  accuracy: "точность",
  time: "время",
  progress: "прогресс",
  footerContent: "Код — TheAlgorithms/Python (MIT). Литература — общественное достояние (Викитека, Project Gutenberg). Частотные слова — FrequencyWords (CC BY-SA 4.0).",
};

export type Dict = { [K in keyof typeof ru]: string };

const en: Dict = {
  title: "ritm — typing speed trainer",
  description: "Typing speed test and a trainer for programmers: retype real Python code with editor-like behaviour.",
  navCode: "Code",
  navText: "Text",
  langSwitch: "Language",
  themeToLight: "Light theme",
  themeToDark: "Dark theme",
  unit: "wpm",
  accuracy: "accuracy",
  time: "time",
  progress: "progress",
  footerContent: "Code from TheAlgorithms/Python (MIT). Literature in the public domain (Wikisource, Project Gutenberg). Frequency words from FrequencyWords (CC BY-SA 4.0).",
};

const DICTS: Record<Lang, Dict> = { ru, en };
export const getDict = (lang: Lang): Dict => DICTS[lang];
