# docs

Personal knowledge base with a streaming-service feel. Astro 7 renders static pages, Svelte 5 powers
the interactive islands, Vite+ (`vp`) runs the toolchain, Tailwind v4 + shadcn/ui tokens handle theming.

## Write

- Markdown in `docs/` → one page per file. Folders become groups; a folder's `index.md` names and orders the group.
- `.mdx` files can import Svelte components via `@components/*` (`Steps`, `Step`, `Callout`, `Tabs`, `Counter`).
- Frontmatter: `title`, `description`, `order`, `tags`, `updated`, `draft`, `banner`, `accent` (hue), `videos` (YouTube ids), `playlist`, `featured`.
- Playlists: YAML files in `docs/playlists/` grouping docs + videos into a series with its own page and banner.
- Banners are generated SVGs by default; set `banner:` to an image under `public/` to override.

See `docs/getting-started/writing-docs.md` for the full reference.

## Features

- Dashboard at `/` with hero, rails (continue reading, playlists, recently updated, per-tag, all articles), ⌘K search.
- `/playlists`, `/playlists/<id>` (video carousel + episode list), `/tags/<tag>`, `/library` (client-side filter).
- Book-like article layout: 68ch measure, serif option, drop cap, reading progress bar, popout table of contents (`t`), "Up next", breadcrumbs.
- Settings (gear icon): 8 theme presets (Default, Catppuccin, Nord, Ayu, Dracula, Rosé Pine, Tokyo Night, Gruvbox) × light/dark/auto, sans/serif font, AI provider + model + API key.
- AI assistant (sparkle FAB): chats about the current page using the reader's own key via the Vercel AI SDK, straight from the browser. Supports Gemini, OpenAI, Anthropic, OpenRouter. Key is kept in sessionStorage unless the reader opts into localStorage. Select text in an article → "Ask AI".

## Run

```sh
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # static output in dist/
pnpm preview
vp lint && vp fmt
```

## Deploy

Push to `main`. `.github/workflows/deploy.yml` builds and publishes to GitHub Pages.
Enable once under **Settings → Pages → Source: GitHub Actions**. The workflow derives `SITE`/`BASE_PATH`
from the repo name and passes `DOCS_DIR` to the build (override it from the manual "Run workflow" dialog).

## Layout

```
docs/                         markdown + docs/playlists/*.yaml
src/content.config.ts         collections (docs, playlists) reading DOCS_DIR
src/lib/nav.ts                groups, breadcrumbs, catalog (cards, tags, playlists)
src/lib/banner.ts             deterministic SVG banners
src/lib/settings.svelte.ts    prefs + AI settings store, cross-island events
src/lib/ai.ts                 AI SDK provider factory + streaming
src/styles/global.css         tokens, prose, steps; themes.css = presets
src/layouts/                  BaseLayout (shell), DocsLayout (article)
src/pages/                    index, playlists, tags, library, [...slug], 404, search.json
src/components/catalog/       Hero, Row, Card, VideoCarousel, LibraryFilter, ContinueReading
src/components/reading/       ReadingProgress, TocDrawer, UpNext
src/components/ai/            AiAssistant (FAB + chat), SelectionPopover
src/components/               SettingsDialog, Search, HeaderActions, Breadcrumbs, doc components
```
