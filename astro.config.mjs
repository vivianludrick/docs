// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import svelte from "@astrojs/svelte";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// SITE and BASE_PATH are injected by the GitHub Pages workflow.
// Locally they default to a root-served site.
const site = process.env.SITE ?? "http://localhost:4321";
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  site,
  base,
  trailingSlash: "ignore",
  integrations: [svelte(), mdx(), sitemap()],
  // Self-hosted fonts: downloaded at build time, served from /_astro with
  // inlined @font-face + metric-matched fallbacks (no third-party CSS chain).
  fonts: [
    {
      provider: fontProviders.google(),
      name: "Inter",
      cssVariable: "--font-inter",
      weights: ["400 800"],
      styles: ["normal"],
      fallbacks: [
        "ui-sans-serif",
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Roboto",
        "sans-serif",
      ],
    },
    {
      provider: fontProviders.google(),
      name: "Source Serif 4",
      cssVariable: "--font-source-serif",
      weights: ["400 600"],
      styles: ["normal", "italic"],
      fallbacks: ["Iowan Old Style", "Georgia", "Times New Roman", "serif"],
    },
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains",
      weights: ["400 500"],
      styles: ["normal"],
      fallbacks: ["ui-monospace", "SF Mono", "Menlo", "Consolas", "monospace"],
    },
  ],
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
