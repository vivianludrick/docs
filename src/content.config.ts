import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// DOCS_DIR lets the GitHub workflow (or any caller) point the build at a
// different markdown folder. Defaults to ./docs at the project root.
const docsDir = process.env.DOCS_DIR ?? "./docs";

const video = z.object({
  id: z.string(), // YouTube video id, e.g. "dQw4w9WgXcQ"
  title: z.string().optional(),
  duration: z.string().optional(), // "12:34"
});

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: docsDir }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().default(999),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    updated: z.coerce.date().optional(),
    /** Image path (under public/) or URL. Omit to get a generated SVG banner. */
    banner: z.string().optional(),
    /** 0-360 hue used by the generated banner + accent highlights. */
    accent: z.number().min(0).max(360).optional(),
    /** YouTube videos shown in a carousel above the article. */
    videos: z.array(video).default([]),
    /** Id of the playlist this doc belongs to (docs/playlists/<id>.yaml). */
    playlist: z.string().optional(),
    /** Show in the dashboard hero rotation. */
    featured: z.boolean().default(false),
  }),
});

const playlists = defineCollection({
  loader: glob({ pattern: "*.{yaml,yml,json}", base: `${docsDir}/playlists` }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    banner: z.string().optional(),
    accent: z.number().min(0).max(360).optional(),
    tags: z.array(z.string()).default([]),
    order: z.number().default(999),
    featured: z.boolean().default(false),
    /** Doc ids in reading order, e.g. ["notes/svelte-runes"]. Docs with `playlist: <id>` are appended automatically. */
    docs: z.array(z.string()).default([]),
  }),
});

export const collections = { docs, playlists };
