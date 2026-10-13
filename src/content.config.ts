import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// DOCS_DIR lets the GitHub workflow (or any caller) point the build at a
// different markdown folder. Defaults to ./docs at the project root.
const docsDir = process.env.DOCS_DIR ?? "./docs";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: docsDir }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().default(999),
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    updated: z.coerce.date().optional(),
  }),
});

export const collections = { docs };
