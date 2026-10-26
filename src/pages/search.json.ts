import type { APIRoute } from "astro";
import { getCatalog } from "../lib/nav";

export const GET: APIRoute = async () => {
  const catalog = await getCatalog();
  const index = [...catalog.playlists, ...catalog.docs].map((it) => ({
    title: it.title,
    description: it.description ?? "",
    href: it.href,
    kind: it.kind,
    section: it.kind === "playlist" ? `Playlist · ${it.docCount} docs` : it.tags.join(", "),
    body: "",
  }));
  // Add searchable body text for docs
  const { getDocs, isRenderable, docHref } = await import("../lib/nav");
  const docs = (await getDocs()).filter(isRenderable);
  const bodies = new Map(docs.map((d) => [docHref(d), d.body ?? ""]));
  for (const it of index) {
    it.body = (bodies.get(it.href) ?? "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[#*_`>[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 4000);
  }
  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json" },
  });
};
