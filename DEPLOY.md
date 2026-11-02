# Развёртывание на слабом сервере (nginx, без Node.js)

Сайт собирается в набор обычных файлов (HTML, JS, CSS, шрифты — около 2 МБ). Серверу нужен только **nginx** и **git**. Node.js, npm и сборка на сервере не нужны: собирает GitHub.

## Как это устроено

1. Вы отправляете изменения в ветку `main`.
2. GitHub Actions (`.github/workflows/build-site.yml`) проверяет проект (линтер, тесты), собирает сайт и кладёт готовые файлы в ветку **`site`**.
3. Сервер забирает ветку `site` командой `git pull` (скрипт `deploy/update-site.sh`), nginx раздаёт файлы.

## Установка на сервер (один раз)

```bash
sudo apt install -y nginx git
```

```bash
curl -fsSLo /tmp/update-site.sh https://raw.githubusercontent.com/<владелец>/<репозиторий>/main/deploy/update-site.sh
```

```bash
sudo sh /tmp/update-site.sh https://github.com/<владелец>/<репозиторий>.git
```

Сайт окажется в `/var/www/ritm`. Для приватного репозитория используйте адрес с токеном доступа только на чтение или deploy key.

Конфиг nginx:

```bash
sudo curl -fsSLo /etc/nginx/sites-available/ritm https://raw.githubusercontent.com/<владелец>/<репозиторий>/main/deploy/nginx.conf
```

Откройте файл и замените `server_name example.com;` на свой домен или IP. Затем:

```bash
sudo ln -s /etc/nginx/sites-available/ritm /etc/nginx/sites-enabled/ritm
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

HTTPS (если есть домен):

```bash
sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d ваш-домен
```

## Обновление сайта

Вручную:

```bash
sudo sh /tmp/update-site.sh
```

Или автоматически раз в 5 минут — добавьте строку в `sudo crontab -e`:

```
*/5 * * * * sh /var/www/update-site.sh >/dev/null 2>&1
```

(предварительно скопируйте скрипт: `sudo cp /tmp/update-site.sh /var/www/update-site.sh`).

## Без GitHub Actions

Соберите сайт на своём компьютере (нужен Node.js 22) и загрузите папку `out/`:

```bash
npm ci && npm run build
```

```bash
scp -r out/* user@сервер:/var/www/ritm/
```

## Что учтено в конфиге nginx

- адреса `/ru/code` отдают файл `ru/code.html`, неизвестные адреса — страницу 404;
- файлы из `/_next/static/` кешируются на год (их имена меняются при каждой сборке), HTML — всегда свежий;
- сжатие gzip;
- папка `.git` и другие скрытые файлы закрыты.

Проверено: весь набор e2e-тестов (33) проходит через nginx 1.24 с этим конфигом.
