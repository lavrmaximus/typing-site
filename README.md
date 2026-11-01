# ритм — тренажёр скорости печати

Тест и тренировка скорости печати на русском и английском. Особенность — режим для программистов: перепечатываете настоящий код на Python, а ввод ведёт себя как редактор (авто-скобки и кавычки, авто-отступы, Ctrl+Enter). Ещё есть ввод с телефона, при котором работают автозамена и свайп.

Этап 1 (этот репозиторий): режимы «Код» и «Текст», RU/EN, без аккаунтов и курса. Дизайн и решения — в `docs/superpowers/specs/2026-11-01-typing-site-demo-design.md`.

## Запуск

```bash
npm install
npm run dev          # http://localhost:3000 → /ru/code или /en/code по языку браузера
```

## Проверки

```bash
npm run lint
npm test             # Vitest: движок печати и контент (каждый фрагмент кода проходится без ошибок)
npm run test:e2e     # сборка + Playwright: страницы, ввод, телефон, доступность
python3 -m unittest scripts/content/test_extract_snippets.py
```

## Устройство

- `src/engine/` — чистый TypeScript без React: сессия кода (правила редактора, допустимые вольности), сессия текста, ввод с телефона по словам, метрики и цвет подсветки.
- `src/ui/` — React-компоненты в стиле «Клавиши · Подсветка»; подсветка корпуса меняет оттенок со скоростью.
- `src/app/[lang]/` — страницы `/ru|en/code` и `/ru|en/text`; `src/proxy.ts` перенаправляет `/` по Accept-Language.
- `content/` — готовые JSON-файлы с контентом и `SOURCES.md` с лицензиями.

## Обновление контента

```bash
npm run content      # TheAlgorithms/Python → snippets.json, Викитека + Project Gutenberg → texts.*.json, FrequencyWords → words.*.json
```

Нужны Python 3 и доступ к github.com, ru.wikisource.org и gutenberg.org. За прокси `NODE_USE_ENV_PROXY=1` уже прописан в npm-скриптах.
