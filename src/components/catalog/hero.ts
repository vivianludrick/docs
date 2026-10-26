import type { CatalogItem } from "../../lib/nav";
import { withBase } from "../../lib/utils";

/** Serializable slide shape shared by Hero.astro and HeroCarousel.svelte (hrefs already base-prefixed). */
export interface HeroSlide {
  kind: "doc" | "playlist";
  title: string;
  description?: string;
  href: string;
  /** Base-less path, used as the bookmark key. */
  key: string;
  watchHref: string | null;
  banner: string;
  hue: number;
  meta: string;
  tags: { label: string; href: string }[];
}

export function itemMeta(item: CatalogItem) {
  return item.kind === "playlist"
    ? `Playlist · ${item.docCount ?? 0} ${item.docCount === 1 ? "doc" : "docs"}`
    : `Article · ${item.readingMinutes ?? 1} min read`;
}

export function toSlide(item: CatalogItem, overrides: Partial<HeroSlide> = {}): HeroSlide {
  return {
    kind: item.kind,
    title: item.title,
    description: item.description,
    href: withBase(item.href),
    key: item.href,
    watchHref: item.watchHref ? withBase(item.watchHref) : null,
    banner: item.banner,
    hue: item.hue,
    meta: itemMeta(item),
    tags: item.tags.map((t) => ({ label: t, href: withBase(`/tags/${t}`) })),
    ...overrides,
  };
}
