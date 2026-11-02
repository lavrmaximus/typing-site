#!/bin/sh
# Pulls the latest built site (the `site` branch) into the nginx folder.
# First run:  sudo sh update-site.sh https://github.com/<owner>/<repo>.git
# Later runs: sudo sh update-site.sh            (or from cron, see DEPLOY.md)
set -eu
DIR=${RITM_DIR:-/var/www/ritm}
REPO=${1:-}
if [ ! -d "$DIR/.git" ]; then
  [ -n "$REPO" ] || { echo "usage: $0 <repository url>  (first run)"; exit 1; }
  git clone --depth 1 --branch site "$REPO" "$DIR"
else
  git -C "$DIR" fetch --depth 1 origin site
  git -C "$DIR" reset --hard origin/site
  git -C "$DIR" clean -fdq
fi
echo "site updated: $(git -C "$DIR" log -1 --format='%s (%cr)')"
