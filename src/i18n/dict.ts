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
  errors: "ошибок",
  again: "Ещё раз",
  focusVeil: "Нажмите сюда и начинайте печатать",
  anotherSnippet: "Другой фрагмент",
  sourceOf: "Источник",
  loading: "Загружаю…",
  line: "строка",
  needsKeyboard: "Режим кода рассчитан на физическую клавиатуру: на телефоне автозамена ломает код. Попробуйте режим «Текст» — там работают автозамена и свайп.",
  toText: "Перейти к тексту",
  keyboardToggle: "Клавиатура",
  hintPairs: "закрываются сами",
  hintOvertype: "поверх готовой скобки — просто шаг вперёд",
  hintEnter: "отступ, после «:» глубже",
  hintCtrlEnter: "новая строка из середины строки",
  hintBackspace: "на отступе стирает 4 пробела",
  hintSpaces: "пробелы вокруг операторов можно пропускать",
  hintEsc: "заново",
  literature: "Литература",
  words: "Слова",
  anotherText: "Другой текст",
  phoneInput: "Ввод с телефона",
  layoutWarning: "Похоже, включена английская раскладка. Переключите на русскую.",
  hintFix: "исправить",
  hintWord: "стереть слово",
  hintAutocorrect: "автозамена работает",
  hintSwipe: "можно вводить свайпом",
  hintSpaceWord: "слово проверяется целиком",
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
  errors: "errors",
  again: "Again",
  focusVeil: "Click here and start typing",
  anotherSnippet: "Another snippet",
  sourceOf: "Source",
  loading: "Loading…",
  line: "line",
  needsKeyboard: "Code mode is built for a physical keyboard: phone autocorrect breaks code. Try Text mode, where autocorrect and swipe typing work.",
  toText: "Go to Text",
  keyboardToggle: "Keyboard",
  hintPairs: "close themselves",
  hintOvertype: "over an auto-closed bracket just steps forward",
  hintEnter: "indents, deeper after “:”",
  hintCtrlEnter: "new line from mid-line",
  hintBackspace: "on indent deletes 4 spaces",
  hintSpaces: "spaces around operators are optional",
  hintEsc: "restart",
  literature: "Literature",
  words: "Words",
  anotherText: "Another text",
  phoneInput: "Phone input",
  layoutWarning: "Looks like a non-English layout is on. Switch to English.",
  hintFix: "fix",
  hintWord: "delete word",
  hintAutocorrect: "autocorrect works",
  hintSwipe: "swipe typing works",
  hintSpaceWord: "each word is checked whole",
  footerContent: "Code from TheAlgorithms/Python (MIT). Literature in the public domain (Wikisource, Project Gutenberg). Frequency words from FrequencyWords (CC BY-SA 4.0).",
};

const DICTS: Record<Lang, Dict> = { ru, en };
export const getDict = (lang: Lang): Dict => DICTS[lang];
