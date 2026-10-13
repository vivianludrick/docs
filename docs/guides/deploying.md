---
title: Deploying to GitHub Pages
description: How the workflow in .github/workflows/deploy.yml works.
order: 1
tags: [github, ci]
---

## One-time setup

1. Push this repo to GitHub.
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`. The site is live a minute later.

## What the workflow does

- Installs with pnpm (cached).
- Computes `SITE` and `BASE_PATH` from the repo name, so `user/docs` deploys to `https://user.github.io/docs/` and `user/user.github.io` deploys to the root.
- Passes `DOCS_DIR` so the build reads markdown from the folder you choose (defaults to `docs`).
- Uploads `dist/` and deploys it.

## Changing the docs folder

Trigger the workflow manually from the **Actions** tab and set the **docs_dir** input, or change the default in the workflow file.
