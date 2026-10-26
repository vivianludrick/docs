import { getCollection, type CollectionEntry } from "astro:content";
import { titleize } from "./utils";

export type DocEntry = CollectionEntry<"docs">;

export interface NavLink {
  title: string;
  href: string; // path without base, e.g. "/getting-started/install"
  id: string;
  order: number;
}

export interface NavGroup {
  label: string;
  slug: string; // folder name, "" for root-level docs
  order: number;
  links: NavLink[];
}

/** Section index files with no body only name/order the group; they get no page. */
export function isSectionIndex(entry: DocEntry) {
  // The glob loader strips "/index" from ids, so "docs/guides/index.md" has id "guides".
  return entry.id !== "index" && /\/index\.mdx?$/.test(entry.filePath ?? "");
}

export function isRenderable(entry: DocEntry) {
  return entry.id !== "index" && (!isSectionIndex(entry) || !!entry.body?.trim());
}

export function docHref(entry: DocEntry) {
  return entry.id === "index" ? "/" : `/${entry.id}`;
}

export async function getDocs(): Promise<DocEntry[]> {
  const all = await getCollection("docs", ({ data }) =>
    import.meta.env.PROD ? !data.draft : true,
  );
  return all.sort((a, b) =>
    a.data.order !== b.data.order
      ? a.data.order - b.data.order
      : a.data.title.localeCompare(b.data.title),
  );
}

/** Build a sidebar tree: one group per top-level folder, root files first. */
export async function getNav(): Promise<NavGroup[]> {
  const docs = await getDocs();
  const groups = new Map<string, NavGroup>();

  for (const doc of docs) {
    const sectionIndex = isSectionIndex(doc);
    const [first, ...rest] = doc.id.split("/");
    const folder = sectionIndex ? doc.id : rest.length ? first : "";

    let group = groups.get(folder);
    if (!group) {
      group = {
        label: folder ? titleize(folder) : "Overview",
        slug: folder,
        order: folder ? 999 : -1,
        links: [],
      };
      groups.set(folder, group);
    }

    // A folder's index.md names and orders the section.
    if (sectionIndex) {
      group.label = doc.data.title;
      group.order = doc.data.order;
    }

    if (!isRenderable(doc)) continue; // root index = landing page; empty section index = label only

    group.links.push({
      title: doc.data.title,
      href: docHref(doc),
      id: doc.id,
      order: sectionIndex ? -1 : doc.data.order,
    });
  }

  const list = [...groups.values()];
  for (const g of list) g.links.sort((a, b) => a.order - b.order);
  return list.sort((a, b) => a.order - b.order);
}

export async function getFlatNav(): Promise<NavLink[]> {
  const nav = await getNav();
  return nav.flatMap((g) => g.links);
}

export interface Crumb {
  title: string;
  href: string | null; // null = not a page, render as plain text
}

/** Home › Folder › Subfolder › Page, labelled from section index files when present. */
export async function getBreadcrumbs(entry: DocEntry): Promise<Crumb[]> {
  const docs = await getDocs();
  const byId = new Map(docs.map((d) => [d.id, d]));
  const crumbs: Crumb[] = [{ title: "Home", href: "/" }];

  const segments = entry.id.split("/");
  const isSection = isSectionIndex(entry);
  const folders = isSection ? segments : segments.slice(0, -1);

  let path = "";
  for (const seg of folders) {
    path = path ? `${path}/${seg}` : seg;
    const section = byId.get(path);
    const renderable = section ? isRenderable(section) : false;
    crumbs.push({
      title: section?.data.title ?? titleize(seg),
      href: renderable && section ? docHref(section) : null,
    });
  }

  if (!isSection) crumbs.push({ title: entry.data.title, href: null });
  else crumbs[crumbs.length - 1].href = null; // current page
  return crumbs;
}

/* ------------------------------------------------------------------ */
/* Catalog: playlists, tags, cards for the Netflix-style dashboard     */
/* ------------------------------------------------------------------ */
import { bannerSvg, accentHue } from "./banner";

export type PlaylistEntry = CollectionEntry<"playlists">;

export interface Video {
  id: string;
  title?: string;
  duration?: string;
}

/** Everything a card / hero needs, for either a doc or a playlist. */
export interface CatalogItem {
  kind: "doc" | "playlist";
  id: string;
  title: string;
  description?: string;
  href: string; // without base
  banner: string; // url or data uri
  hue: number;
  tags: string[];
  featured: boolean;
  updated?: Date;
  readingMinutes?: number; // docs only
  docCount?: number; // playlists only
  videos: Video[];
  /** Where the "Watch" button should go (base-less). Playlists point at their first doc that has a video. */
  watchHref: string | null;
}

export function readingMinutes(body: string | undefined) {
  const words = (body ?? "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export function resolveBanner(seed: string, banner?: string, hue?: number) {
  if (!banner) return bannerSvg(seed, { hue });
  if (/^(https?:)?\/\//.test(banner) || banner.startsWith("data:")) return banner;
  // relative to public/
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${base}/${banner.replace(/^\//, "")}`;
}

export function docToItem(d: DocEntry): CatalogItem {
  const hue = accentHue(d.id, d.data.accent);
  return {
    kind: "doc",
    id: d.id,
    title: d.data.title,
    description: d.data.description,
    href: docHref(d),
    banner: resolveBanner(d.data.title, d.data.banner, hue),
    hue,
    tags: d.data.tags,
    featured: d.data.featured,
    updated: d.data.updated,
    readingMinutes: readingMinutes(d.body),
    videos: d.data.videos,
    watchHref: d.data.videos.length ? `${docHref(d)}#videos` : null,
  };
}

export async function getPlaylists(): Promise<PlaylistEntry[]> {
  const all = await getCollection("playlists");
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** Docs of a playlist, in order: explicit `docs:` list first, then any doc declaring `playlist: <id>`. */
export async function getPlaylistDocs(p: PlaylistEntry): Promise<DocEntry[]> {
  const docs = (await getDocs()).filter(isRenderable);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const ordered: DocEntry[] = [];
  for (const id of p.data.docs) {
    const d = byId.get(id);
    if (d && !ordered.includes(d)) ordered.push(d);
  }
  for (const d of docs) if (d.data.playlist === p.id && !ordered.includes(d)) ordered.push(d);
  return ordered;
}

export async function playlistToItem(p: PlaylistEntry): Promise<CatalogItem> {
  const hue = accentHue(p.id, p.data.accent);
  const docs = await getPlaylistDocs(p);
  return {
    kind: "playlist",
    id: p.id,
    title: p.data.title,
    description: p.data.description,
    href: `/playlists/${p.id}`,
    banner: resolveBanner(p.data.title, p.data.banner, hue),
    hue,
    tags: p.data.tags,
    featured: p.data.featured,
    updated: docs
      .map((d) => d.data.updated)
      .filter(Boolean)
      .sort((a, b) => b!.getTime() - a!.getTime())[0],
    docCount: docs.length,
    videos: docs.flatMap((d) => d.data.videos),
    watchHref: (() => {
      const first = docs.find((d) => d.data.videos.length);
      return first ? `${docHref(first)}#videos` : null;
    })(),
  };
}

/** Maximum number of slides in the home-page hero. */
export const HERO_MAX_SLIDES = 5;

export async function getCatalog() {
  const [docs, playlists] = await Promise.all([getDocs(), getPlaylists()]);
  const docItems = docs.filter(isRenderable).map(docToItem);
  const playlistItems = await Promise.all(playlists.map(playlistToItem));
  const tags = new Map<string, CatalogItem[]>();
  for (const it of [...playlistItems, ...docItems]) {
    for (const t of it.tags) tags.set(t, [...(tags.get(t) ?? []), it]);
  }
  return {
    docs: docItems,
    playlists: playlistItems,
    tags: [...tags.entries()].sort((a, b) => b[1].length - a[1].length),
    // Hero rotation: featured items, most recently updated first, capped so a
    // long-lived site can't end up with dozens of slides (and banner preloads).
    featured: [...playlistItems, ...docItems]
      .filter((i) => i.featured)
      .sort((a, b) => (b.updated?.getTime() ?? 0) - (a.updated?.getTime() ?? 0))
      .slice(0, HERO_MAX_SLIDES),
    recent: [...docItems]
      .filter((d) => d.updated)
      .sort((a, b) => b.updated!.getTime() - a.updated!.getTime())
      .slice(0, 12),
  };
}
