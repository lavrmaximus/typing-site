# Развёртывание на слабом сервере

Что работает на сервере:

- **nginx** раздаёт готовый сайт: обычные файлы HTML, JS и CSS, около 2 МБ;
- **API на FastAPI + SQLite** отвечает за аккаунты, вход через Telegram и статистику. Это одна служба systemd, ей хватает 40–60 МБ памяти, база данных — один файл.

Node.js и сборка на сервере не нужны: сайт собирает GitHub и кладёт результат в ветку **`site`**. В этой ветке, в скрытой папке `.deploy/`, лежат и код API, и конфиг nginx, и скрипты, и эта инструкция. nginx эту папку наружу не отдаёт.

Пути на сервере:

| Что | Где |
|---|---|
| сайт (ветка `site`) | `/var/www/ritm` |
| код API | `/var/www/ritm/.deploy/backend` |
| Python-окружение API | `/opt/ritm/venv` |
| настройки API | `/etc/ritm/api.env` |
| база данных | `/var/lib/ritm/ritm.db` |

## 1. Поддомен (если домен на другом сервере)

У регистратора или там, где у вас управление DNS, добавьте **A-запись**: имя `typing` (или любое другое), значение — IP этого сервера. Через 5–30 минут `typing.ваш-домен` начнёт указывать сюда. Основной домен и его сайты на другом сервере это не затрагивает.

Проверка (должен вывести IP этого сервера):

```bash
getent hosts typing.ваш-домен
```

## 2. Установка

```bash
sudo apt update && sudo apt install -y nginx git python3-venv curl
```

```bash
sudo git clone --depth 1 --branch site https://github.com/lavrmaximus/typing-site.git /var/www/ritm
```

Если репозиторий приватный, git спросит логин и пароль. Вместо пароля введите [personal access token](https://github.com/settings/tokens) с правом только на чтение.

**API** (создаёт пользователя `ritm`, окружение Python, настройки и службу `ritm-api`):

```bash
sudo sh /var/www/ritm/.deploy/setup-api.sh
```

В конце должно появиться `{"telegramBot":null}  <- API is up`.

**nginx:**

```bash
sudo cp /var/www/ritm/.deploy/nginx.conf /etc/nginx/sites-available/ritm
```

```bash
sudo nano /etc/nginx/sites-available/ritm
```

В строке `server_name example.com;` укажите `typing.ваш-домен` (или IP сервера) и сохраните: Ctrl+O, Enter, Ctrl+X.

```bash
sudo ln -sf /etc/nginx/sites-available/ritm /etc/nginx/sites-enabled/ritm && sudo rm -f /etc/nginx/sites-enabled/default
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Откройте `http://typing.ваш-домен/`: работают тренажёр, курс, регистрация по логину и паролю и статистика.

## 3. HTTPS

Порт 80 должен быть открыт: Let's Encrypt проверяет поддомен через него.

```bash
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d typing.ваш-домен
```

certbot сам допишет HTTPS в конфиг nginx и будет продлевать сертификат. Cookie входа автоматически получает флаг Secure, как только сайт открывают по HTTPS: это настройка `RITM_COOKIE_SECURE=auto`.

## 4. Вход через Telegram

Нужен HTTPS-домен из шага 3.

1. В Telegram откройте [@BotFather](https://t.me/BotFather) и отправьте команду `/newbot`. Придумайте имя и логин бота, например `ritm_typing_bot`. BotFather пришлёт токен вида `123456789:AA...`.
2. Отправьте BotFather команду `/setdomain`, выберите бота и укажите `typing.ваш-домен`.
3. Пропишите бота в настройках API:

   ```bash
   sudo nano /etc/ritm/api.env
   ```

   ```
   RITM_TELEGRAM_BOT_TOKEN=123456789:AA...
   RITM_TELEGRAM_BOT_NAME=ritm_typing_bot
   ```

   Имя бота указывается без `@`.

4. Перезапустите API:

   ```bash
   sudo systemctl restart ritm-api
   ```

На странице «Войти» появится кнопка Telegram. Тот, кто уже вошёл по логину и паролю, может привязать к аккаунту Telegram и дальше входить без пароля.

## Обновление

После каждого обновления ветки `main` GitHub Actions проверяет проект (тесты сайта и API), собирает сайт и обновляет ветку `site`. Это занимает около 3 минут. На сервере:

```bash
sudo sh /var/www/ritm/.deploy/update-site.sh
```

Скрипт забирает новую сборку, а если изменился код API, обновляет зависимости и перезапускает службу.

Автоматически раз в 10 минут: откройте `sudo crontab -e` и добавьте строку:

```
*/10 * * * * sh /var/www/ritm/.deploy/update-site.sh >/dev/null 2>&1
```

## Обслуживание

| Задача | Команда |
|---|---|
| состояние API | `systemctl status ritm-api` |
| журнал API | `journalctl -u ritm-api -n 100` |
| перезапуск API | `sudo systemctl restart ritm-api` |
| резервная копия базы | `sudo sqlite3 /var/lib/ritm/ritm.db ".backup /root/ritm-$(date +%F).db"` |

Для резервной копии нужен пакет `sqlite3`: `sudo apt install -y sqlite3`.

## Без GitHub Actions

С любого компьютера с Node.js 22 (и `rsync`):

```bash
npm ci && sh scripts/publish-site.sh
```

Скрипт собирает сайт и обновляет ветку `site` так же, как это делает GitHub.

## Проверено

Весь набор сквозных тестов (47) проходит через nginx 1.24 с этим конфигом и API в той же раскладке папок, что на сервере.
