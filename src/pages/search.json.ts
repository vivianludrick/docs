import type { APIRoute } from "astro";
import { getDocs, docHref, getNav, isRenderable } from "../lib/nav";

export const GET: APIRoute = async () => {
  const [docs, nav] = await Promise.all([getDocs(), getNav()]);
  const sectionOf = (id: string) => {
    const folder = id.includes("/") ? id.split("/")[0] : "";
    return nav.find((g) => g.slug === folder)?.label ?? "";
  };
  const index = docs.filter(isRenderable).map((d) => ({
    title: d.data.title,
    description: d.data.description ?? "",
    href: docHref(d),
    section: sectionOf(d.id),
    body: (d.body ?? "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[#*_`>\[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 4000),
  }));
  return new Response(JSON.stringify(index), {
    headers: { "Content-Type": "application/json" },
  });
};
