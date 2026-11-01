# Тренажёр «ритм», этап 1 — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Демо-сайт на Next.js с режимами «Код» (Python, поведение редактора) и «Текст» (литература / слова, ввод с телефона), RU/EN, в дизайне «Клавиши · Подсветка». Без аккаунтов и курса.

**Architecture:** Чистый TypeScript-движок в `src/engine` (без React, неизменяемые функции `state → state`), покрытый Vitest. React-слой в `src/ui` только рисует модель разметки, которую отдаёт движок. Контент собирают скрипты в `scripts/content` в JSON-файлы в `content/`, страницы генерируются статически.

**Tech Stack:** Node 22, Next.js 16 (App Router) + React 19 + TypeScript (strict), CSS Modules + CSS-переменные, `next/font/google`, Vitest, Playwright (Chromium уже установлен в окружении: `require('playwright')`, не ставить браузеры заново), Python 3 stdlib для разбора кода в скрипте контента.

**Spec:** `docs/superpowers/specs/2026-11-01-typing-site-demo-design.md`. Эталон поведения: `docs/superpowers/prototype/ritm-prototype.html`. Эталон вида: вариант 3 в `docs/superpowers/prototype/design-keys-variations.html`.

## Global Constraints

- Ошибка никогда не блокирует ввод; всё исправимо Backspace.
- Символы не накладываются друг на друга; авто-закрывающие символы рисуются в конце строки, полупрозрачно, с пунктиром.
- Один постоянный элемент курсора, не пересоздаётся при перерисовке; двигается `transform` с переходом.
- Подсказки к ошибкам (`data-exp` / `data-typed`) позиционируются абсолютно и не сдвигают текст.
- В тексте печати лигатуры выключены: `font-variant-ligatures: none; font-feature-settings: "liga" 0, "calt" 0`.
- Окно кода: 5 строк, сдвиг начинается, когда курсор на 3-й видимой строке. Окно текста: 3 строки, сдвиг со 2-й.
- Отступ = 4 пробела; Tab до следующего кратного 4; Enter после строки на `:` добавляет 4.
- Скорость: RU — знаки в минуту (`cpm`), EN — WPM = cpm / 5. Таймер с первого нажатия.
- Вольности: необязательный пробел (удаление не склеивает два `\w`-символа) можно пропустить; `'` ≡ `"` только на границе строки. `x = x + 1` ≠ `x += 1`.
- Подсветка: hue 205 (≤150 cpm) → 25 (≥500 cpm), линейно; ошибки на цвет не влияют.
- Темы: тёмная основная + светлая; обе через токены на `:root` / `[data-theme]`.
- Шрифты: Rubik Mono One (логотип), Rubik (интерфейс), JetBrains Mono (печать). Только с кириллицей.
- Mac: Cmd работает как Ctrl.
- Контент только из открытых источников; у каждого элемента хранится источник. Литература нормализуется: «»„““” → `"`, — – → `-`, … → `...`, NBSP → пробел, «ё» сохраняется.
- Сохраняются в localStorage только настройки (язык UI не храним — он в URL; режим текста, число слов, тема, ввод с телефона, показ клавиатуры). Доступ к localStorage в try/catch.
- Никаких идентификаторов моделей в коммитах и коде.

## Review Focus

1. Ввод без `keydown`-символа (IME, вставка, `key === "Process"/"Unidentified"`) на десктопе — текст всё равно попадает в движок через событие `input`. → Task 7, тест `e2e/code.spec.ts › insertText fallback`.
2. Автозамена правит **уже подтверждённое** слово (курсор в поле уходит назад) — оценка пересчитывается по всему значению поля, ничего не ломается. → Task 4, тест `phone › re-evaluates earlier word edits`.
3. Backspace на начале строки, когда впереди висят авто-закрывающие символы, — строки склеиваются, `pending` не теряется и не дублируется. → Task 2, тест `backspace at line start keeps pending`.
4. Русские тексты в дореформенной орфографии (ѣ, і, ѳ, ѵ, «ъ» на конце слов) из Викитеки — такие отрывки отбрасываются. → Task 5, тест `rejects pre-reform orthography`.
5. Потеря фокуса посреди теста (переход на другую вкладку, клик мимо) — показывается вуаль «нажмите, чтобы продолжить», нажатия вне поля возвращают фокус и не теряются. → Task 7, тест `e2e/code.spec.ts › refocus after blur`.

---

## Файловая структура

```
package.json, tsconfig.json, next.config.ts, vitest.config.ts, playwright.config.ts, .gitignore (+ .cache/, .superpowers/)
content/                     snippets.json, texts.ru.json, texts.en.json, words.ru.json, words.en.json, SOURCES.md
scripts/content/
  extract_snippets.py        python: ast-разбор TheAlgorithms → JSON
  test_extract_snippets.py   unittest
  normalize.ts               нормализация литературы + нарезка на отрывки
  build-texts.ts             EN (GITenberg) + RU (Викитека) → texts.*.json
  build-words.ts             FrequencyWords → words.*.json
src/engine/
  types.ts                   Key, Mark, LineView, TokenKind
  python-tokens.ts           tokenizePython
  leniency.ts                isOptionalSpace, charsMatch
  code.ts                    код-сессия
  text.ts                    текст-сессия (клавиатура)
  phone.ts                   phoneView
  metrics.ts                 speed, accuracy, glowHue
src/content/load.ts          типы и выборка контента
src/i18n/dict.ts             строки RU/EN
src/app/                     layout.tsx, globals.css, [lang]/layout.tsx, [lang]/code/page.tsx, [lang]/text/page.tsx, page.tsx
src/middleware.ts            / → /ru или /en
src/ui/                      KeyCap, Shell, Device, Readout, Keyboard, Caret, CodeWindow, TextWindow, PhoneWindow, ResultPanel, Hints, Toast, useTypingSession, useGlow, usePrefs (+ *.module.css)
e2e/                         code.spec.ts, text.spec.ts, phone.spec.ts, routing.spec.ts
```

---

### Task 1: Каркас проекта, тесты, маршруты по языку

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/[lang]/layout.tsx`, `src/app/[lang]/code/page.tsx`, `src/app/[lang]/text/page.tsx`, `src/middleware.ts`, `src/i18n/dict.ts`, `e2e/routing.spec.ts`

**Interfaces:**
- Produces: `type Lang = "ru" | "en"`; `LANGS: Lang[]`; `getDict(lang: Lang): Dict` (`Dict` — плоский объект строк, ключи добавляют последующие задачи); `generateStaticParams()` в `[lang]/layout.tsx` возвращает `[{lang:"ru"},{lang:"en"}]`; неизвестный `lang` → `notFound()`.
- Скрипты npm: `dev`, `build`, `start`, `lint`, `test` (vitest run), `test:e2e` (playwright, сам поднимает `next start` на порту 3100 после `next build`), `content` (все скрипты контента).

- [ ] **Step 1:** `npx create-next-app@16 . --ts --app --src-dir --no-tailwind --eslint --import-alias "@/*" --use-npm` (в существующую папку: перенести `README.md`, сохранить `docs/` и `.claude/`). Добавить `vitest`, `@playwright/test` (версия, совпадающая с предустановленным Playwright: `node -e "console.log(require('playwright/package.json').version)"`), `tsx`.
- [ ] **Step 2: Failing e2e**

```ts
// e2e/routing.spec.ts
test("root redirects by Accept-Language", async ({ browser }) => {
  const ru = await browser.newContext({ locale: "ru-RU" });
  const p1 = await ru.newPage(); await p1.goto("/");
  await expect(p1).toHaveURL(/\/ru\/code$/);
  const en = await browser.newContext({ locale: "en-US" });
  const p2 = await en.newPage(); await p2.goto("/");
  await expect(p2).toHaveURL(/\/en\/code$/);
});
test("unknown lang is 404", async ({ page }) => {
  const r = await page.goto("/de/code"); expect(r?.status()).toBe(404);
});
test("html lang attribute follows route", async ({ page }) => {
  await page.goto("/en/text"); await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
```
- [ ] **Step 3:** `npm run test:e2e -- routing` → FAIL.
- [ ] **Step 4:** Реализовать middleware (Accept-Language, по умолчанию `ru`; если язык начинается с `ru`/`uk`/`be`/`kk` → `ru`, иначе `en`), заглушки страниц с заголовком из словаря.
- [ ] **Step 5:** `npm run test:e2e -- routing` → PASS; `npm run lint` → без ошибок.
- [ ] **Step 6:** Commit `chore: scaffold Next.js app with lang routing and test tooling`.

---

### Task 2: Python-токенизатор и код-движок

**Files:**
- Create: `src/engine/types.ts`, `src/engine/python-tokens.ts`, `src/engine/code.ts`
- Test: `src/engine/python-tokens.test.ts`, `src/engine/code.test.ts`

**Interfaces:**
- Produces:
  - `type Key = {kind:"char"; ch:string} | {kind:"enter"; ctrl:boolean} | {kind:"backspace"; word:boolean} | {kind:"tab"} | {kind:"end"}`
  - `type TokenKind = "kw"|"str"|"num"|"fn"|"com"|"bi"|""`; `interface TokenInfo { kind: TokenKind; delimiter: boolean }` — `delimiter` true только для открывающих/закрывающих кавычек строки (включая все три в `"""`), префикс `f` — `str`, но не delimiter.
  - `tokenizePython(src: string): TokenInfo[]` (длина = `src.length`).
  - `interface CodeState { target: string; buf: string; pending: string; keys: number; errors: number }`
  - `createCodeState(target: string): CodeState`
  - `applyCodeKey(s: CodeState, key: Key): CodeState` — чистая функция.
  - `codeCursor(s: CodeState): { line: number; col: number }`
  - `isCodeComplete(s: CodeState): boolean` — сравнение после `rtrim` каждой строки и снятия финальных переводов строк, с учётом `charsMatch` из Task 3 (до Task 3 — строгое равенство).

Правила `applyCodeKey` — таблица «Правила редактора» из спеки и реализация `codeType/codeEnter/codeBackspace/commitPendingLine` в прототипе (`ritm-prototype.html`, раздел `editing (code)`). Счётчики: каждое `char`/`enter`/`tab` = +1 `keys`; `errors` +1, если записанный символ не совпадает с образцом в той же позиции (строка/колонка), или `enter` создаёт строку сверх числа строк образца.

- [ ] **Step 1: Failing tests** (`code.test.ts`; helper `type(s, text)` подаёт каждый символ как `char`, `\n` как `enter`)

```ts
test("auto-pairs brackets and overtypes closer", () => {
  let s = type(createCodeState("f(x)"), "f(");
  expect([s.buf, s.pending]).toEqual(["f(", ")"]);
  s = type(s, "x)"); expect([s.buf, s.pending]).toEqual(["f(x)", ""]);
});
test("quote not paired after word char or inside string", () => {
  expect(type(createCodeState(""), 'f"').pending).toBe("");
  expect(type(createCodeState(""), 'print(f"{a}').pending).toBe(")");
  expect(type(createCodeState(""), 'print(f"{a}"').pending).toBe(")");
});
test("triple quotes", () => {
  const s = type(createCodeState(""), '"""doc"""');
  expect([s.buf, s.pending]).toEqual(['"""doc"""', ""]);
});
test("enter indents, deeper after colon, strips blank line", () => {
  let s = type(createCodeState(""), "def f():\nx\n");
  expect(s.buf).toBe("def f():\n    x\n    ");
  s = applyCodeKey(s, { kind: "enter", ctrl: false });
  expect(s.buf).toBe("def f():\n    x\n\n    ");
});
test("ctrl+enter commits pending closers", () => {
  let s = type(createCodeState(""), "print(f(a");
  s = applyCodeKey(s, { kind: "enter", ctrl: true });
  expect([s.buf, s.pending]).toEqual(["print(f(a))\n", ""]);
});
test("backspace removes indent to previous multiple of 4 and pairs", () => {
  let s = type(createCodeState(""), "if a:\n");                       // "    "
  s = applyCodeKey(s, { kind: "backspace", word: false }); expect(s.buf).toBe("if a:\n");
  s = type(createCodeState(""), "(");
  s = applyCodeKey(s, { kind: "backspace", word: false }); expect([s.buf, s.pending]).toEqual(["", ""]);
});
test("backspace at line start keeps pending", () => {          // Review Focus 3
  let s = type(createCodeState(""), "f(\n");                    // buf "f(\n", pending ")"
  s = applyCodeKey(s, { kind: "backspace", word: false });
  expect([s.buf, s.pending]).toEqual(["f(", ")"]);
});
test("tab pads to next multiple of 4", () => {
  const s = applyCodeKey(type(createCodeState(""), "ab"), { kind: "tab" });
  expect(s.buf).toBe("ab  ");
});
test("whole prototype snippets complete with zero errors", () => {
  // typeLikeHuman: для каждой строки образца — Backspace до нужного отступа, набрать strip(),
  // затем Enter (как e2e-скрипт t.cjs в истории прототипа). Оба SNIPPETS из прототипа.
  for (const src of PROTOTYPE_SNIPPETS) {
    const s = typeLikeHuman(createCodeState(src), src);
    expect(isCodeComplete(s)).toBe(true); expect(s.errors).toBe(0);
  }
});
```
`python-tokens.test.ts`: `def` → kw; имя после `def` → fn; `len` → bi; `"""x"""` — все 6 кавычек delimiter, `x` — str не delimiter; `# c` → com; `12` → num; `f"a"` — `f` str не delimiter.
- [ ] **Step 2:** `npx vitest run src/engine` → FAIL.
- [ ] **Step 3:** Реализовать `tokenizePython`, `createCodeState`, `applyCodeKey`, `codeCursor`, `isCodeComplete`. Перенос логики из прототипа; каждая ветка возвращает новый объект.
- [ ] **Step 4:** `npx vitest run src/engine` → PASS.
- [ ] **Step 5:** Commit `feat(engine): python tokenizer and editor-like code session`.

---

### Task 3: Вольности и модель разметки строк кода

**Files:**
- Create: `src/engine/leniency.ts`
- Modify: `src/engine/code.ts` (авто-пропуск пробела, `isCodeComplete` через `charsMatch`), `src/engine/types.ts`
- Test: `src/engine/leniency.test.ts`, `src/engine/code-view.test.ts`

**Interfaces:**
- Consumes: Task 2 целиком.
- Produces:
  - `isOptionalSpace(line: string, col: number): boolean` — `line[col] === " "`, `col` не в ведущем отступе, и ближайшие не-пробельные символы слева и справа не являются оба `\w`. Пробелы внутри строкового литерала не необязательны (передаётся `TokenInfo` строки: сигнатура `isOptionalSpace(line: string, col: number, tokens: TokenInfo[]): boolean`, где `tokens` — срез для этой строки).
  - `charsMatch(typed: string, expected: string, delimiter: boolean): boolean` — равенство, либо обе кавычки (`'`/`"`) и `delimiter`.
  - `interface Mark { status: "ok"|"err"|"todo"|"extra"; ch: string; expected?: string; token?: TokenKind; caret?: true; typedWord?: string }`
  - `interface LineView { index: number; marks: Mark[]; ghosts: string; current: boolean; extra: boolean }`
  - `codeView(s: CodeState, tokens: TokenInfo[]): LineView[]` — для `err` в `ch` лежит **набранный** символ (пробел → `␣`), в `expected` — образец (пробел → `␣`). `ghosts` — авто-закрывающие символы текущей строки, ещё не набранные. Ровно одна отметка `caret` (или у конца строки — последний Mark-заглушка `{status:"todo", ch:" ", caret:true}`).
- Авто-пропуск в `applyCodeKey`: если в позиции курсора необязательный пробел(ы), а введённый символ совпадает (через `charsMatch`) с первым не-пробельным символом после них, — дописать эти пробелы в `buf` без увеличения `keys`, затем обработать символ как обычно.

- [ ] **Step 1: Failing tests**

```ts
test("optional spaces", () => {
  const l = "x = a + 1, f(y)"; const t = tokenizePython(l);
  expect(isOptionalSpace(l, 1, t)).toBe(true);           // before =
  expect(isOptionalSpace(l, 10, t)).toBe(true);         // after ","
});
test("space between words is required", () => {
  const l = "return mid"; expect(isOptionalSpace(l, 6, tokenizePython(l))).toBe(false);
});
test("space inside string is required", () => {
  const l = 'a = "b c"'; expect(isOptionalSpace(l, 6, tokenizePython(l))).toBe(false);
});
test("skipping optional spaces is not an error", () => {
  const s = type(createCodeState("x = 1"), "x=1");
  expect(s.buf).toBe("x = 1"); expect(s.errors).toBe(0); expect(isCodeComplete(s)).toBe(true);
});
test("x = x + 1 is not x += 1", () => {
  const s = type(createCodeState("x += 1"), "x = x + 1");
  expect(isCodeComplete(s)).toBe(false); expect(s.errors).toBeGreaterThan(0);
});
test("single quotes accepted for double-quoted string", () => {
  const s = type(createCodeState('a = "hi"'), "a = 'hi'");
  expect(s.errors).toBe(0); expect(isCodeComplete(s)).toBe(true);
});
test("quote inside string content must match", () => {
  const s = type(createCodeState(`a = "don't"`), `a = "don"t"`); expect(s.errors).toBeGreaterThan(0);
});
test("codeView shows typed char with expected and ghosts at line end", () => {
  const s = type(createCodeState("print(ab)"), "print(ax");
  const [line] = codeView(s, tokenizePython(s.target));
  const err = line.marks.find(m => m.status === "err")!;
  expect([err.ch, err.expected]).toEqual(["x", "b"]);
  expect(line.ghosts).toBe(")");
  expect(line.marks.filter(m => m.caret)).toHaveLength(1);
});
```
- [ ] **Step 2:** `npx vitest run src/engine` → FAIL.
- [ ] **Step 3:** Реализовать `leniency.ts`, `codeView`, авто-пропуск; `isCodeComplete` сравнивает посимвольно через `charsMatch`.
- [ ] **Step 4:** `npx vitest run src/engine` → PASS (включая тесты Task 2).
- [ ] **Step 5:** Commit `feat(engine): optional spaces, quote equivalence, line view model`.

---

### Task 4: Текст-движок, телефонный ввод, метрики

**Files:**
- Create: `src/engine/text.ts`, `src/engine/phone.ts`, `src/engine/metrics.ts`
- Test: `src/engine/text.test.ts`, `src/engine/phone.test.ts`, `src/engine/metrics.test.ts`

**Interfaces:**
- Consumes: `Key`, `Mark` (Task 2–3).
- Produces:
  - `interface TextState { target: string; buf: string; keys: number; errors: number }`; `createTextState(target)`, `applyTextKey(s, key: Key): TextState` (char — дописать, если `buf.length < target.length`; backspace / word-backspace; прочие клавиши игнор), `textMarks(s): Mark[]` (длина = `target.length`; для err `ch` — набранный, `expected` — образец, пробел → `␣`), `isTextComplete(s)`.
  - `interface PhoneView { marks: Mark[]; committed: number; wrongWords: number; correctChars: number; done: boolean }`; `phoneView(target: string, field: string): PhoneView` — слова = `field.trimStart().split(/\s+/)`, последнее — текущее; неверное подтверждённое слово: все его Mark `err`, в первом `typedWord` = что вписала клавиатура; текущее слово сравнивается по буквам; `done` — все слова подтверждены или последнее совпало без пробела.
  - `textCorrectChars(s: TextState): number`, `codeCorrectChars(s: CodeState): number` (правильные символы + переводы строк набранных строк).
  - `speed(correctChars: number, ms: number, unit: "cpm"|"wpm"): number` — округление, при `ms < 1000` знаменатель = 1 с.
  - `accuracy(keys: number, errors: number): number` — 100 при `keys = 0`, иначе `round((keys-errors)/keys*100)`, не ниже 0.
  - `glowHue(cpm: number): number` — 205 → 25 линейно на [150, 500], зажато; `glowStrength(cpm): number` — 0.18 → 0.53 на том же отрезке.

- [ ] **Step 1: Failing tests**

```ts
test("text marks show typed vs expected", () => {
  const s = typeText(createTextState("на"), "ня");
  expect(textMarks(s)[1]).toMatchObject({ status: "err", ch: "я", expected: "а" });
});
test("text input stops at end", () => {
  expect(typeText(createTextState("ab"), "abc").buf).toBe("ab");
});
test("phone: wrong committed word keeps sample, exposes typed word", () => {
  const v = phoneView("что на", "чтобы ");
  expect(v.marks[0]).toMatchObject({ status: "err", ch: "ч", typedWord: "чтобы" });
  expect(v.wrongWords).toBe(1);
});
test("phone: done when last word matches without trailing space", () => {
  expect(phoneView("a b", "a b").done).toBe(true);
});
test("phone: re-evaluates earlier word edits", () => {          // Review Focus 2
  expect(phoneView("что на", "чтл на").wrongWords).toBe(1);
  expect(phoneView("что на", "что на").wrongWords).toBe(0);
});
test("metrics", () => {
  expect(speed(500, 60_000, "cpm")).toBe(500);
  expect(speed(500, 60_000, "wpm")).toBe(100);
  expect(accuracy(0, 0)).toBe(100);
  expect(glowHue(100)).toBe(205); expect(glowHue(500)).toBe(25); expect(glowHue(325)).toBe(115);
});
```
- [ ] **Step 2:** `npx vitest run src/engine` → FAIL.
- [ ] **Step 3:** Реализовать три модуля.
- [ ] **Step 4:** `npx vitest run src/engine` → PASS.
- [ ] **Step 5:** Commit `feat(engine): text session, phone word view, metrics`.

---

### Task 5: Сбор контента

**Files:**
- Create: `scripts/content/extract_snippets.py`, `scripts/content/test_extract_snippets.py`, `scripts/content/normalize.ts`, `scripts/content/normalize.test.ts`, `scripts/content/build-texts.ts`, `scripts/content/build-words.ts`, `content/*.json`, `content/SOURCES.md`, `src/content/load.ts`
- Test: `src/content/load.test.ts`

**Interfaces:**
- Produces (`src/content/load.ts`):
  - `interface Snippet { id: string; path: string; url: string; code: string }`
  - `interface Passage { id: string; text: string; author: string; work: string; url: string }`
  - `getSnippets(): Snippet[]`, `getPassages(lang: Lang): Passage[]`, `getWords(lang: Lang): string[]`, `pickWords(lang: Lang, n: 25|50|100, rand?: () => number): string`.
  - `normalizeLiterary(raw: string): string`; `splitPassages(text: string, min = 150, max = 400): string[]` (границы — конец предложения `[.!?…]` + пробел + заглавная); `isModernOrthography(s: string): boolean` (нет `ѣіѳѵ` и нет `ъ` перед пробелом/знаком препинания).

Источники (сеть окружения: github.com и raw.githubusercontent.com доступны; gutenberg.org и ru.wikisource.org — **закрыты** политикой):
- Код: `git clone --depth 1 https://github.com/TheAlgorithms/Python .cache/TheAlgorithms` (`.cache/` в .gitignore). `extract_snippets.py` через `ast` берёт функции/классы верхнего уровня, выкидывает doctest-строки, сокращает докстринг до первой строки, ужимает пустые строки внутри до одной, фильтр из спеки (8–40 строк, ASCII, без табов, строки ≤ 88), `url` = `https://github.com/TheAlgorithms/Python/blob/master/<path>`. Цель ≥ 100.
- EN: зеркало GITenberg на GitHub, `https://raw.githubusercontent.com/GITenberg/<repo>/master/<id>.txt`. Минимум: Pride-and-Prejudice_1342, A-Tale-of-Two-Cities_98, Alice-s-Adventures-in-Wonderland_11, The-Adventures-of-Sherlock-Holmes_1661, Frankenstein_84 (проверить точные имена репо через `gh api search/repositories -f q='org:GITenberg <title>'`). Срезать шапку/подвал между `*** START` / `*** END`. Цель ≥ 60 отрывков.
- RU: `https://ru.wikisource.org/w/index.php?title=<Title>&action=raw` для текстов в современной орфографии (Чехов, Толстой, Пушкин, Тургенев, Гоголь). **Если хост закрыт — остановиться и попросить владельца открыть `ru.wikisource.org` в настройках сети окружения; RU-литературу не подменять самодельными текстами.** Вики-разметку снять (шаблоны `{{…}}`, ссылки `[[a|b]]` → `b`, теги, сноски). Цель ≥ 60 отрывков.
- Слова: `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/{ru,en}/{ru,en}_50k.txt` (CC-BY-SA 4.0 — указать в SOURCES.md и подвале). Только буквы своего алфавита, длина ≥ 2, без блок-листа грубой лексики (`scripts/content/blocklist.{ru,en}.txt`), первые 1000.

- [ ] **Step 1: Failing tests**

```ts
// normalize.test.ts
test("normalizes typography", () => {
  expect(normalizeLiterary("«Да» — сказал он…\u00a0ёж")).toBe('"Да" - сказал он... ёж');
});
test("rejects pre-reform orthography", () => {                 // Review Focus 4
  expect(isModernOrthography("Всѣ счастливыя семьи")).toBe(false);
  expect(isModernOrthography("съ нимъ")).toBe(false);
  expect(isModernOrthography("подъезд и объём")).toBe(true);
});
test("passages are whole sentences within bounds", () => {
  for (const p of splitPassages(SAMPLE_CHAPTER)) {
    expect(p.length).toBeGreaterThanOrEqual(150); expect(p.length).toBeLessThanOrEqual(400);
    expect(p).toMatch(/^[A-ZА-ЯЁ"]/); expect(p).toMatch(/[.!?"]$/);
  }
});
// load.test.ts
test("content volumes", () => {
  expect(getSnippets().length).toBeGreaterThanOrEqual(100);
  for (const l of LANGS) { expect(getPassages(l).length).toBeGreaterThanOrEqual(60); expect(getWords(l).length).toBe(1000); }
});
test("every snippet passes the code engine with zero errors", () => {
  for (const sn of getSnippets()) {
    const s = typeLikeHuman(createCodeState(sn.code), sn.code);
    expect(isCodeComplete(s)).toBe(true);
  }
});
```
`test_extract_snippets.py` (`python3 -m unittest scripts/content/test_extract_snippets.py`): на фикстуре-функции с doctest и длинным докстрингом результат без `>>>`, докстринг из одной строки, двойные пустые строки ужаты; файл с табами отброшен.
- [ ] **Step 2:** запустить тесты → FAIL.
- [ ] **Step 3:** Реализовать скрипты, `npm run content`, закоммитить JSON и `SOURCES.md` (источник, лицензия, ссылка для каждого набора).
- [ ] **Step 4:** все тесты → PASS.
- [ ] **Step 5:** Commit `feat(content): open-licensed snippets, passages and word lists`.

---

### Task 6: Дизайн-система «Клавиши · Подсветка» и каркас страницы

**Files:**
- Create: `src/app/globals.css` (токены), `src/ui/KeyCap.tsx`, `src/ui/Shell.tsx`, `src/ui/Device.tsx`, `src/ui/Readout.tsx`, `src/ui/Keyboard.tsx`, `src/ui/useGlow.ts`, `src/ui/usePrefs.ts`, `src/ui/ThemeToggle.tsx` + `*.module.css`
- Modify: `src/app/layout.tsx` (шрифты `next/font/google`: Rubik, Rubik_Mono_One, JetBrains_Mono, subsets `["latin","cyrillic"]`), `src/app/[lang]/layout.tsx`

**Interfaces:**
- Consumes: `glowHue`, `glowStrength` (Task 4), `getDict`.
- Produces:
  - `<Shell lang mode>` — логотип, навигация-клавиши «Код / Текст» (ссылки `/{lang}/code`, `/{lang}/text`), переключатель языка (та же страница в другом языке), переключатель темы; слот `children`.
  - `<KeyCap as="button"|"a"|"div" pressed? accent?>` — нажатие проседает (`translateY(depth-1)`).
  - `<Device glowCpm={number}>` — корпус + подсветка снизу; выставляет `--glow-h` и `--glow-a` на себе с CSS-переходом 600 мс.
  - `<Readout speed unit acc time progress>`.
  - `<Keyboard layout="qwerty-ru" pressed={string|null}>` — ряды как в макете (латиница + кириллица, засечки F/J); `pressed` подсвечивается 110 мс.
  - `usePrefs(): [Prefs, (p: Partial<Prefs>) => void]`, `Prefs = { theme: "dark"|"light"; textKind: "lit"|"words"; wordCount: 25|50|100; phone: boolean|null; keyboard: boolean }`.
- Вид — один в один с вариантом 3 макета (токены оттуда, обе темы). `prefers-reduced-motion`: без анимаций, подсветка статична.

- [ ] **Step 1: Failing e2e** (`e2e/routing.spec.ts`, дописать)

```ts
test("shell renders keycap nav and switches language keeping mode", async ({ page }) => {
  await page.goto("/ru/text");
  await page.getByRole("link", { name: "EN" }).click();
  await expect(page).toHaveURL(/\/en\/text$/);
  await expect(page.getByRole("link", { name: "Code" })).toBeVisible();
});
test("theme toggle persists", async ({ page }) => {
  await page.goto("/ru/code");
  await page.getByRole("button", { name: /светлая|тема/i }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
```
- [ ] **Step 2:** `npm run test:e2e -- routing` → FAIL.
- [ ] **Step 3:** Реализовать компоненты; тема применяется до гидрации инлайн-скриптом в `<head>` (без вспышки).
- [ ] **Step 4:** e2e → PASS. Снять скриншоты `/ru/code` 1280×900 и 400×800 в обеих темах в `.superpowers/shots/` и сверить глазами с макетом.
- [ ] **Step 5:** Commit `feat(ui): keys/backlight design system and page shell`.

---

### Task 7: Страница «Код»

**Files:**
- Create: `src/ui/useTypingSession.ts`, `src/ui/Caret.tsx`, `src/ui/CodeWindow.tsx`, `src/ui/ResultPanel.tsx`, `src/ui/Hints.tsx` + css
- Modify: `src/app/[lang]/code/page.tsx`, `src/i18n/dict.ts`
- Test: `e2e/code.spec.ts`

**Interfaces:**
- Consumes: `createCodeState/applyCodeKey/codeView/isCodeComplete/codeCorrectChars` (Task 2–4), `speed/accuracy`, `getSnippets`, Task 6 компоненты.
- Produces:
  - `useTypingSession<S>(engine: { create(): S; apply(s: S, k: Key): S; complete(s: S): boolean; correct(s: S): number; keys(s: S): number; errors(s: S): number }, opts: { unit: "cpm"|"wpm" })` → `{ state, onKey(k: Key), onText(t: string), reset(), started, done, elapsedMs, speed, accuracy, samples: number[], lastKey: string|null }`. Обновление статистики раз в 250 мс, `samples` раз в секунду.
  - `<Caret target: HTMLElement|null lineIndex lh>` — один постоянный элемент.
  - Скрытое `<textarea>` захватывает ввод: `keydown` маппится в `Key` (Ctrl/Cmd учитываются; Esc → reset; Enter на экране результата → reset); событие `input` с текстом (IME/вставка/`Process`) подаётся символами через `onText`, затем поле очищается.
- Страница: выбор случайного фрагмента; кнопка «Другой фрагмент»; ярлык файла со ссылкой на источник; окно 5 строк со сдвигом; горизонтальная прокрутка за курсором; `ghosts`; подсказки `data-exp`; результат поверх окна (скорость, точность, время, ошибки, линия `samples`); подсказки клавиш; клавиатура под устройством (`prefs.keyboard`). На `(pointer: coarse)` вместо окна — сообщение, что режим кода работает с физической клавиатурой, и ссылка на «Текст».

- [ ] **Step 1: Failing e2e**

```ts
test("type a whole snippet like a human -> 100% result", async ({ page }) => {
  await page.goto("/ru/code?snippet=<id of a 10–15 line snippet>");   // query param выбирает фрагмент (для тестов и ссылок)
  await typeSnippetLikeHuman(page, code);                              // как t.cjs: Backspace до отступа, strip, Enter
  await expect(page.getByTestId("result")).toBeVisible();
  await expect(page.getByTestId("result-accuracy")).toHaveText("100%");
});
test("error shows typed and expected", async ({ page }) => {
  await page.goto("/ru/code?snippet=<id>"); await page.keyboard.type("dfx");
  const err = page.locator("[data-exp]").first();
  await expect(err).toHaveText("f"); await expect(err).toHaveAttribute("data-exp", "e");
});
test("caret never jumps to origin while typing", async ({ page }) => { /* как t5.cjs: min x после каждой клавиши > x первого символа - 2 */ });
test("no ligatures", async ({ page }) => { /* computed font-variant-ligatures === "none" у окна */ });
test("insertText fallback", async ({ page }) => {              // Review Focus 1
  await page.goto("/ru/code?snippet=<id>"); await page.keyboard.insertText("def");
  await expect(page.locator(".ok, [data-status=ok]")).toHaveCount(3);
});
test("refocus after blur", async ({ page }) => {               // Review Focus 5
  await page.goto("/ru/code?snippet=<id>"); await page.keyboard.type("de");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await expect(page.getByTestId("focus-veil")).toBeVisible();
  await page.keyboard.type("f");
  await expect(page.getByTestId("focus-veil")).toBeHidden();
  /* три ok-символа */
});
test("window scrolls once caret reaches 3rd line", async ({ page }) => { /* translateY == 0 на строках 1–2, < 0 на 4-й */ });
```
- [ ] **Step 2:** `npm run build && npm run test:e2e -- code` → FAIL.
- [ ] **Step 3:** Реализовать хук, окно, курсор, результат, подсказки; подключить `Device glowCpm={speed in cpm}` и `Keyboard pressed={lastKey}`.
- [ ] **Step 4:** e2e → PASS; `npx vitest run` → PASS.
- [ ] **Step 5:** Commit `feat(code): code typing page`.

---

### Task 8: Страница «Текст» и ввод с телефона

**Files:**
- Create: `src/ui/TextWindow.tsx`, `src/ui/PhoneWindow.tsx`, `src/ui/Toast.tsx` + css
- Modify: `src/app/[lang]/text/page.tsx`, `src/i18n/dict.ts`
- Test: `e2e/text.spec.ts`, `e2e/phone.spec.ts`

**Interfaces:**
- Consumes: `createTextState/applyTextKey/textMarks/isTextComplete/textCorrectChars`, `phoneView`, `getPassages`, `pickWords`, Task 6–7 (`useTypingSession`, `Caret`, `ResultPanel`, `Device`, `Readout`).
- Produces: страница с переключателем «Литература / Слова», для слов — 25/50/100; «Другой текст»; подпись источника (автор, произведение, ссылка); окно 3 строки, перенос по словам (символы — inline `span`, без inline-block), сдвиг со 2-й строки; тост о раскладке (RU-текст + латинская буква, или EN-текст + кириллица), не чаще раза в 3 с.
- Телефон: `prefs.phone ?? matchMedia("(pointer: coarse)")`; кнопка «Ввод с телефона»; видимое прозрачное поле (`font-size: 16px`, `autocorrect="on" autocapitalize="sentences" autocomplete="on" spellcheck="true"`), значение поля — источник истины, `phoneView` на каждое `input`; подписи `data-typed` над неверными словами; клавиатура скрыта; точность по словам; по завершении `blur()` поля.

- [ ] **Step 1: Failing e2e**

```ts
test("literature passage completes", async ({ page }) => {
  await page.goto("/ru/text?passage=<id>"); await page.keyboard.insertText(passageText);
  await expect(page.getByTestId("result")).toBeVisible();
});
test("words mode count", async ({ page }) => {
  await page.goto("/en/text"); await page.getByRole("button", { name: "Words" }).click();
  await page.getByRole("button", { name: "25" }).click();
  expect((await page.getByTestId("text-target").innerText()).trim().split(/\s+/)).toHaveLength(25);
});
test("layout toast", async ({ page }) => {
  await page.goto("/ru/text?passage=<id>"); await page.keyboard.type("g");
  await expect(page.getByRole("status")).toContainText("раскладк");
});
// phone.spec.ts — test.use({ ...devices["Pixel 7"] })
test("autocorrected wrong word shows what keyboard typed", async ({ page }) => {
  await page.goto("/ru/text?passage=<id starting 'Говорили, что на'>"); await page.getByTestId("stage").tap();
  await page.keyboard.insertText("Говорили, чтобы ");
  await expect(page.locator("[data-typed='чтобы']")).toBeVisible();
});
test("code page on phone explains keyboard requirement", async ({ page }) => {
  await page.goto("/ru/code"); await expect(page.getByTestId("code-needs-keyboard")).toBeVisible();
});
```
- [ ] **Step 2:** `npm run build && npm run test:e2e -- text phone` → FAIL.
- [ ] **Step 3:** Реализовать.
- [ ] **Step 4:** e2e → PASS.
- [ ] **Step 5:** Commit `feat(text): literature/words modes and phone input`.

---

### Task 9: Доводка и приёмка

**Files:**
- Modify: компоненты `src/ui/*` (фокус, reduced motion), `src/app/[lang]/layout.tsx` (метаданные, подвал с лицензиями: MIT TheAlgorithms, CC-BY-SA FrequencyWords, общественное достояние для литературы), `README.md` (запуск, тесты, `npm run content`)

- [ ] **Step 1:** Добавить e2e `a11y`: Tab по клавишам навигации даёт видимый `:focus-visible`; при `reducedMotion: "reduce"` у `.content` нет `transition`.
- [ ] **Step 2:** `npm run lint && npx vitest run && npm run build && npm run test:e2e` → всё зелёное.
- [ ] **Step 3:** Скриншоты обеих страниц, обеих тем, 1280 и 400 px → сверить с макетом; исправить расхождения.
- [ ] **Step 4:** Commit `chore: polish, licenses footer, README` и `git push -u origin claude/dreamy-brown-92mwa6`.
