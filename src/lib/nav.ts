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
