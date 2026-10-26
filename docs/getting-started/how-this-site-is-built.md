---
title: How this site is built
description: Astro renders, Svelte hydrates, Vite+ runs the toolchain, and plain markdown in a root folder is the only input.
order: 0
tags: [meta, astro, svelte]
updated: 2026-10-26
---

This site is a static build. There is no server, no database, and nothing to
run in production other than a folder of HTML on GitHub Pages.

## The stack

| Layer      | Choice                         | Why                                                                   |
| ---------- | ------------------------------ | --------------------------------------------------------------------- |
| Framework  | Astro 7                        | Static output, content collections, islands for the interactive bits. |
| Components | Svelte 5                       | Small, fast islands with runes. Everything interactive is Svelte.     |
| Toolchain  | Vite+ (`vp`)                   | One binary for dev, build, lint, and format.                          |
| Styling    | Tailwind v4 + shadcn/ui tokens | Theme presets are just different values for the same CSS variables.   |
| Hosting    | GitHub Pages                   | A workflow builds on push and deploys the `dist` folder.              |

## Where things live

```text
docs/                      your markdown and MDX, plus docs/playlists/*.yaml
src/content.config.ts      the two collections (docs, playlists) and their frontmatter schema
src/lib/nav.ts             groups, breadcrumbs, catalog cards, playlists, tags
src/lib/banner.ts          generated SVG banners when a doc has no image
src/lib/settings.svelte.ts theme, reading font, and AI settings store
src/lib/bookmarks.svelte.ts bookmarks store (localStorage)
src/layouts/               BaseLayout (shell) and DocsLayout (the article page)
src/pages/                 home, playlists, tags, library, bookmarks, the doc route
src/components/            Svelte islands and small Astro pieces
src/styles/                tokens, prose styles, theme presets
```

## How a page is produced

<div class="steps">

### A markdown file is picked up

The `docs` collection globs every `.md` and `.mdx` file under `docs/`. The file
path becomes the URL, so `docs/guides/deploying.md` is served at `/guides/deploying`.

### Frontmatter is validated

The schema in `src/content.config.ts` checks the fields. A typo in `featured`
or a missing `title` fails the build rather than quietly rendering wrong.

### The catalog is assembled

`getCatalog()` turns every doc and playlist into a card: banner, hue, tags, read
time, and a watch link if the doc has videos. The home page, library, tags, and
playlists all read from this one list.

### The article layout renders it

`DocsLayout` adds the banner strip, title block, video player, prose styles,
"Up next", pagination, and injects the raw markdown into the page for the AI
assistant to use as context.

</div>

## What runs in the browser

Only the islands hydrate. On an article page that is the bookmark button, the
table-of-contents drawer, the playlist drawer, reading progress, the video
player, search, settings, and the AI assistant. Everything else is static HTML.

Three things are stored in the browser and never leave it:

- **Preferences**: theme, mode, reading font.
- **Bookmarks** and **reading progress**: what powers the home page rails.
- **Your AI key**: session storage by default, local storage only if you opt in.

## Theming

Every colour in the UI is a CSS variable from the shadcn/ui token set. A theme
preset such as Nord or Catppuccin is a block in `src/styles/themes.css` that
overrides those variables for `html[data-theme="nord"]`, with a `.dark`
variant. Adding a preset is adding one block and one entry in the settings
store's theme list.
