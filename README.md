# docs

Personal documentation site. Astro renders the pages, Svelte 5 powers the interactive islands,
Vite+ (`vp`) runs the toolchain, and the theme uses shadcn/ui tokens on Tailwind v4.

## Write

Add markdown to `docs/`. Folders become sidebar groups; a folder's `index.md` names and orders the group.
Use `.mdx` when you want Svelte components (`Steps`, `Step`, `Callout`, `Tabs`, `Counter`) in a page.
See `docs/getting-started/` for the full frontmatter reference.

## Run

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # static output in dist/
pnpm preview
vp lint && vp fmt
```

## Deploy

Push to `main`. `.github/workflows/deploy.yml` configures and publishes to GitHub Pages.
The workflow computes `SITE`/`BASE_PATH` from the repo name and passes `DOCS_DIR` to the build
(override it from the manual "Run workflow" dialog).

## Layout

```
docs/                 markdown content (the only folder you normally touch)
src/content.config.ts content collection reading DOCS_DIR (default ./docs)
src/lib/nav.ts        sidebar tree + prev/next ordering
src/layouts/          BaseLayout (shell) + DocsLayout (article, TOC, pagination)
src/pages/            index, [...slug], 404, search.json
src/components/       Svelte islands
src/styles/global.css shadcn tokens, prose styles, steps counter
```
