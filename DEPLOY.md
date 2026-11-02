# Развёртывание на слабом сервере (nginx, без Node.js)

Сайт собирается в набор обычных файлов (HTML, JS, CSS, шрифты — около 2 МБ). Серверу нужны только **nginx** и **git**. Node.js, npm и сборка на сервере не нужны.

Готовый сайт лежит в ветке **`site`** этого репозитория. В ней же, в скрытой папке `.deploy/`, лежат конфиг nginx, скрипт обновления и эта инструкция. nginx эту папку наружу не отдаёт.

## Установка (один раз)

**1. Поставить nginx и git**

```bash
sudo apt update && sudo apt install -y nginx git
```

**2. Скачать готовый сайт в `/var/www/ritm`**

```bash
sudo git clone --depth 1 --branch site https://github.com/lavrmaximus/typing-site.git /var/www/ritm
```

Если репозиторий приватный, git спросит логин и пароль: вместо пароля введите [personal access token](https://github.com/settings/tokens) с правом только на чтение.

**3. Подключить конфиг nginx**

```bash
sudo cp /var/www/ritm/.deploy/nginx.conf /etc/nginx/sites-available/ritm
```

```bash
sudo nano /etc/nginx/sites-available/ritm
```

В строке `server_name example.com;` поставьте свой домен или IP сервера и сохраните (Ctrl+O, Enter, Ctrl+X).

```bash
sudo ln -sf /etc/nginx/sites-available/ritm /etc/nginx/sites-enabled/ritm
```

Если на сервере больше нет других сайтов, уберите стандартную заглушку nginx:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

**4. Проверить и запустить**

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Откройте в браузере `http://ваш-домен-или-IP/` — откроется тренажёр.

**5. HTTPS (если есть домен, по желанию)**

```bash
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d ваш-домен
```

## Обновление сайта

Когда в ветке `site` появляется новая сборка:

```bash
sudo sh /var/www/ritm/.deploy/update-site.sh
```

Автоматически раз в 10 минут — откройте `sudo crontab -e` и добавьте строку:

```
*/10 * * * * sh /var/www/ritm/.deploy/update-site.sh >/dev/null 2>&1
```

## Откуда берётся ветка `site`

- **Автоматически.** После слияния в `main` GitHub Actions (`.github/workflows/build-site.yml`) проверяет проект, собирает сайт и обновляет ветку `site`.
- **Вручную** с любого компьютера с Node.js 22:

  ```bash
  npm ci && sh scripts/publish-site.sh
  ```

- **Без git на сервере.** Соберите `npm ci && npm run build` и загрузите содержимое папки `out/`:

  ```bash
  scp -r out/* user@сервер:/var/www/ritm/
  ```

## Что учтено в конфиге nginx

- адреса вида `/ru/code` отдают файл `ru/code.html`, неизвестные адреса — страницу 404;
- файлы из `/_next/static/` кешируются на год (их имена меняются при каждой сборке), HTML всегда свежий;
- сжатие gzip;
- папка `.git`, `.deploy` и другие скрытые файлы закрыты.

Проверено: весь набор e2e-тестов (33) проходит через nginx 1.24 с этим конфигом.
