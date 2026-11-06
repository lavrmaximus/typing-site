# Project notes for Claude

@AGENTS.md

## Deploy

- `main` auto-deploys to production. When a change should go live, push it to `main`
  (fast-forward / merge the working branch into `main` and `git push origin HEAD:main`),
  in addition to the session's working branch.
