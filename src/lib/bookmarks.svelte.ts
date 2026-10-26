/**
 * Bookmarks live in the browser (static site, no server):
 *   localStorage["docs:bookmarks"] = { [href]: { title: string; at: number } }
 * `href` is the base-less path, e.g. "/notes/svelte-runes". Every island shares the
 * `bookmarks` rune state below; `docs:bookmarks-changed` keeps islands in sync.
 */
export const BOOKMARKS_KEY = "docs:bookmarks";
export const BOOKMARKS_EVENT = "docs:bookmarks-changed";

export interface Bookmark {
  title: string;
  at: number;
}

export const bookmarks = $state<Record<string, Bookmark>>({});

let loaded = false;
export function loadBookmarks() {
  if (typeof window === "undefined") return;
  read();
  if (loaded) return;
  loaded = true;
  window.addEventListener("storage", (e) => e.key === BOOKMARKS_KEY && read());
  window.addEventListener(BOOKMARKS_EVENT, read);
}

function read() {
  try {
    const raw = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) ?? "{}") as Record<string, Bookmark>;
    for (const k of Object.keys(bookmarks)) if (!(k in raw)) delete bookmarks[k];
    Object.assign(bookmarks, raw);
  } catch {}
}

function write() {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {}
  window.dispatchEvent(new CustomEvent(BOOKMARKS_EVENT));
}

export function isBookmarked(href: string) {
  return href in bookmarks;
}

export function toggleBookmark(href: string, title: string) {
  if (href in bookmarks) delete bookmarks[href];
  else bookmarks[href] = { title, at: Date.now() };
  write();
  return href in bookmarks;
}

/** Newest first. */
export function bookmarkList() {
  return Object.entries(bookmarks)
    .map(([href, b]) => ({ href, ...b }))
    .sort((a, b) => b.at - a.at);
}
