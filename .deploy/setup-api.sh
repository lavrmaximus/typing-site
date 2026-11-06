#!/bin/sh
# One-time (and safe to re-run) setup of the ritm API on the server.
# Needs the site checkout at /var/www/ritm (see DEPLOY.md).  Run: sudo sh setup-api.sh
set -eu
SRC=${RITM_DIR:-/var/www/ritm}/.deploy
[ -d "$SRC/backend" ] || { echo "no $SRC/backend: clone the site branch first (DEPLOY.md, step 2)"; exit 1; }

apt-get install -y -qq python3-venv >/dev/null
id ritm >/dev/null 2>&1 || useradd --system --home /var/lib/ritm --shell /usr/sbin/nologin ritm
install -d -o ritm -g ritm -m 750 /var/lib/ritm
install -d -m 755 /opt/ritm /etc/ritm

[ -x /opt/ritm/venv/bin/python ] || python3 -m venv /opt/ritm/venv
/opt/ritm/venv/bin/pip install -q --upgrade pip
/opt/ritm/venv/bin/pip install -q -r "$SRC/backend/requirements.txt"

if [ ! -f /etc/ritm/api.env ]; then
  install -m 640 -g ritm "$SRC/api.env.example" /etc/ritm/api.env
  echo "created /etc/ritm/api.env (edit it for Telegram)"
fi

install -m 644 "$SRC/ritm-api.service" /etc/systemd/system/ritm-api.service
systemctl daemon-reload
systemctl enable --now ritm-api
systemctl restart ritm-api
sleep 2
curl -fsS http://127.0.0.1:8000/api/config && echo "  <- API is up"
