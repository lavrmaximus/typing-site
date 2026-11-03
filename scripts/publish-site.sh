#!/bin/sh
# Builds the site and pushes the ready-to-serve files (plus nginx config,
# update script and DEPLOY.md in .deploy/) to the `site` branch of origin.
# Same result as the GitHub Actions workflow, for when you publish by hand.
set -eu
npm run build
mkdir -p out/.deploy
cp deploy/nginx.conf deploy/update-site.sh deploy/setup-api.sh deploy/ritm-api.service deploy/api.env.example DEPLOY.md out/.deploy/
rsync -a --exclude tests --exclude __pycache__ --exclude .pytest_cache --exclude "*.db*" backend/ out/.deploy/backend/
touch out/.nojekyll
URL=$(git remote get-url origin)
SHA=$(git rev-parse --short HEAD)
cd out
rm -rf .git
git init -q -b site
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-ritm-publisher}" -c user.email="${GIT_AUTHOR_EMAIL:-publisher@localhost}" commit -q -m "Build of $SHA"
git push -f "$URL" site
rm -rf .git
