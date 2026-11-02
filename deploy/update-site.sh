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
  git -C "$DIR" fetch --depth 1 origin site
  git -C "$DIR" reset --hard origin/site
  git -C "$DIR" clean -fdq
fi
echo "site updated: $(git -C "$DIR" log -1 --format='%s (%cr)')"
