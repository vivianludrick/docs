---
title: Writing docs
description: How this site turns markdown into pages.
order: 1
tags: [meta]
updated: 2026-10-12
---

## Folder layout

Every markdown file under `docs/` becomes a page. Folders become sidebar groups.

```
docs/
├── index.md                 → /            (landing page)
├── getting-started/
│   ├── index.md             → names + orders the "Getting Started" group
│   └── writing-docs.md      → /getting-started/writing-docs
└── notes/
    └── svelte-runes.md      → /notes/svelte-runes
```

## Frontmatter

| Field         | Type     | Purpose                                          |
| ------------- | -------- | ------------------------------------------------ |
| `title`       | string   | Required. Page title + sidebar label.            |
| `description` | string   | Shown under the title and in search.             |
| `order`       | number   | Sidebar sort order (lower first). Default `999`. |
| `tags`        | string[] | Small pills under the title.                     |
| `updated`     | date     | Shown as "Updated …".                            |
| `draft`       | boolean  | `true` hides the page from production builds.    |

A folder's own `index.md` controls the group label and group order.

## Playlists

A playlist is a YAML file in `docs/playlists/`. It groups docs (and videos) into a
series with its own banner and page.

```yaml
# docs/playlists/site-meta.yaml
title: How this site works
description: The stack, how to write docs, and how it deploys.
accent: 210
tags: [meta]
featured: true
docs:
  - getting-started/how-this-site-is-built
  - getting-started/writing-docs
```

Playlists only group documents. Videos always belong to a document (`videos:` in its
frontmatter), and a playlist's "Watch" button jumps to the first document that has one.

Docs listed under `docs:` come first in that order. Any doc whose frontmatter says
`playlist: site-meta` is appended automatically.

## Code blocks

Fenced code gets Shiki highlighting with a light/dark theme and a copy button.

```ts
const greet = (name: string) => `Hello, ${name}`;
console.log(greet("world"));
```

## Steps in plain markdown

Wrap `###` headings in a `<div class="steps">` and the counter appears automatically.

<div class="steps">

### Install dependencies

Run `pnpm install` once after cloning.

### Start the dev server

`pnpm dev` and open http://localhost:4321.

### Write

Add a markdown file under `docs/` and it shows up instantly.

</div>

> Blockquotes, **bold**, _italic_, `inline code`, and <kbd>Cmd</kbd> + <kbd>K</kbd> all work.
