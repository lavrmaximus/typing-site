# ритм — тренажёр скорости печати

Тест и тренировка скорости печати на русском и английском. Особенность — режим для программистов: перепечатываете настоящий код на Python, а ввод ведёт себя как редактор (авто-скобки и кавычки, авто-отступы, Ctrl+Enter). Ещё есть ввод с телефона, при котором работают автозамена и свайп.

Что есть: режимы «Код» и «Текст», курс слепой печати для ЙЦУКЕН и QWERTY, аккаунты (логин и пароль или Telegram) и статистика. RU/EN. Решения — в `docs/superpowers/specs/`.

## Запуск

```bash
npm install
npm run dev          # http://localhost:3000 → /ru/code или /en/code по языку браузера
```

Сайт статический: `npm run build` собирает его в папку `out/`, которую раздаёт nginx без Node.js. Аккаунты и статистику обслуживает API на FastAPI + SQLite в папке `backend/`. Развёртывание — в [DEPLOY.md](DEPLOY.md).

Локально вместе с API:

```bash
python3 -m venv .venv-api && .venv-api/bin/pip install -r backend/requirements-dev.txt
(cd backend && RITM_DB=../.cache/dev.db ../.venv-api/bin/uvicorn ritm_api.main:create_app --factory --port 8000) &
npm run build && API_URL=http://127.0.0.1:8000 npm start      # http://localhost:3000
```

Без API (`npm run dev`) сайт работает в гостевом режиме: результаты хранятся в браузере.

## Проверки

```bash
npm run lint
npm test             # Vitest: движок печати и контент (каждый фрагмент кода проходится без ошибок)
npm run test:e2e     # сборка + Playwright: страницы, ввод, телефон, доступность
python3 -m unittest scripts/content/test_extract_snippets.py
(cd backend && ../.venv-api/bin/python -m pytest -q)   # API
```

e2e-тесты сами поднимают API (из `.venv-api`) со свежей базой и статический сервер.

## Устройство

- `src/engine/` — чистый TypeScript без React: сессия кода (правила редактора, допустимые вольности), сессия текста, ввод с телефона по словам, метрики и цвет подсветки.
- `src/ui/` — React-компоненты в стиле «Клавиши · Подсветка»; подсветка корпуса меняет оттенок со скоростью.
- `src/app/[lang]/` — страницы `/ru|en/code` и `/ru|en/text`; `/`, `/ru`, `/en` перенаправляют в браузере (последняя открытая страница или язык браузера).
- `src/course/` — уроки курса, генератор упражнений, оценка; `src/account/` — клиент API, гостевые результаты, подсчёт статистики.
- `backend/` — API: пользователи, сессии (httpOnly cookie), пароли (scrypt), вход через Telegram, результаты.
- `deploy/` — конфиг nginx, служба systemd для API, скрипты установки и обновления сервера; `.github/workflows/build-site.yml` собирает сайт в ветку `site`.
- `content/` — готовые JSON-файлы с контентом и `SOURCES.md` с лицензиями.

## Обновление контента

```bash
npm run content      # TheAlgorithms/Python → snippets.json, Викитека + Project Gutenberg → texts.*.json, FrequencyWords → words.*.json
```

Нужны Python 3 и доступ к github.com, ru.wikisource.org и gutenberg.org. За прокси `NODE_USE_ENV_PROXY=1` уже прописан в npm-скриптах.
