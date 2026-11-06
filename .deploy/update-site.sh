#!/bin/sh
# Pulls the latest built site (the `site` branch) into the nginx folder.
# Usually lives in the site itself: sudo sh /var/www/ritm/.deploy/update-site.sh
# Fresh server: sudo sh update-site.sh https://github.com/lavrmaximus/typing-site.git
set -eu
DIR=${RITM_DIR:-/var/www/ritm}
REPO=${1:-}
if [ ! -d "$DIR/.git" ]; then
  [ -n "$REPO" ] || { echo "usage: $0 <repository url>  (first run)"; exit 1; }
  git clone --depth 1 --branch site "$REPO" "$DIR"
else
  OLD=$(git -C "$DIR" rev-parse HEAD)
  git -C "$DIR" fetch --depth 1 origin site
  git -C "$DIR" reset --hard origin/site
  git -C "$DIR" clean -fdq
  # the API lives in the same branch: refresh it when its code changed
  if systemctl is-enabled ritm-api >/dev/null 2>&1; then
    if ! git -C "$DIR" diff --quiet "$OLD" HEAD -- .deploy/backend .deploy/ritm-api.service 2>/dev/null; then
      /opt/ritm/venv/bin/pip install -q -r "$DIR/.deploy/backend/requirements.txt"
      install -m 644 "$DIR/.deploy/ritm-api.service" /etc/systemd/system/ritm-api.service
      systemctl daemon-reload
      systemctl restart ritm-api
      echo "API restarted"
    fi
  fi
fi
echo "site updated: $(git -C "$DIR" log -1 --format='%s (%cr)')"
