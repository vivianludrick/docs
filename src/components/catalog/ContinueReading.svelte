<script lang="ts">
  /**
   * "Continue reading" rail. Reads localStorage["docs:progress"]:
   *   { [href]: { title: string; pct: number; at: number } }
   * where href is the doc path with or without the site base. Renders nothing when empty.
   * `items` maps base-less href -> card data so we can show the right banner.
   */
  import { onMount } from "svelte";
  import { ChevronLeft, ChevronRight, FileText, ListVideo } from "lucide-svelte";

  type Meta = { title: string; banner: string; hue: number; kind: "doc" | "playlist" };
  type Progress = { title?: string; pct?: number; at?: number };
  let { items, base = "/" }: { items: Record<string, Meta>; base?: string } = $props();

  type Entry = Meta & { href: string; pct: number; at: number };
  let entries = $state<Entry[]>([]);
  let rail = $state<HTMLDivElement | null>(null);
  let atStart = $state(true);
  let atEnd = $state(true);

  const prefix = base.replace(/\/$/, "");
  const strip = (h: string) => (prefix && h.startsWith(prefix) ? h.slice(prefix.length) || "/" : h);

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem("docs:progress") ?? "{}") as Record<string, Progress>;
      entries = Object.entries(raw)
        .map(([href, p]) => {
          const key = strip(href);
          const meta = items[key];
          const pct = Math.max(0, Math.min(100, Number(p?.pct ?? 0)));
          return {
            href: `${prefix}${key.startsWith("/") ? key : `/${key}`}`,
            title: p?.title ?? meta?.title ?? key,
            banner: meta?.banner ?? "",
            hue: meta?.hue ?? 220,
            kind: meta?.kind ?? "doc",
            pct,
            at: Number(p?.at ?? 0),
          };
        })
        .filter((e) => e.pct < 98)
        .sort((a, b) => b.at - a.at)
        .slice(0, 12);
    } catch {
      entries = [];
    }
  }

  function update() {
    if (!rail) return;
    atStart = rail.scrollLeft <= 4;
    atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  }
  function scroll(dir: 1 | -1) {
    rail?.scrollBy({ left: dir * Math.max(rail.clientWidth * 0.8, 200), behavior: "smooth" });
  }

  onMount(() => {
    load();
    const onStorage = (e: StorageEvent) => e.key === "docs:progress" && load();
    window.addEventListener("storage", onStorage);
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("resize", update);
    };
  });
  $effect(() => {
    if (entries.length) queueMicrotask(update);
  });
</script>

{#if entries.length}
  <section class="group/row">
    <div class="mx-auto flex max-w-screen-2xl items-baseline justify-between px-4 md:px-8">
      <h2 class="text-lg font-bold tracking-tight md:text-xl">Continue reading</h2>
      <span class="text-sm text-muted-foreground">Pick up where you left off</span>
    </div>
    <div class="relative">
      <div
        bind:this={rail}
        onscroll={update}
        class="mx-auto flex max-w-screen-2xl snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-10 pt-4 [scrollbar-width:none] md:scroll-pl-8 md:gap-4 md:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {#each entries as e (e.href)}
          <a
            href={e.href}
            class="group relative block w-[70vw] shrink-0 transform-gpu snap-start outline-none transition-transform duration-300 ease-out will-change-transform hover:z-10 hover:-translate-y-1 hover:scale-[1.03] focus-visible:scale-[1.03] sm:w-[280px]"
            style={`--glow: hsl(${e.hue} 70% 50% / 0.4)`}
          >
            <div
              class="relative aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/0 transition-shadow duration-300 ease-out group-hover:shadow-[0_20px_40px_-12px_var(--glow)] group-hover:ring-foreground/15 group-focus-visible:ring-2 group-focus-visible:ring-ring"
            >
              {#if e.banner}
                <img src={e.banner} alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover" />
              {:else}
                <div class="absolute inset-0" style={`background: hsl(${e.hue} 50% 25%)`}></div>
              {/if}
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5"></div>
              <span class="absolute right-2 top-2 rounded-md bg-black/65 px-1.5 py-0.5 font-mono text-[11px] font-medium text-white backdrop-blur-sm">
                {Math.round(e.pct)}%
              </span>
              <div class="absolute inset-x-0 bottom-0 p-3 pb-4">
                <div class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/70">
                  {#if e.kind === "playlist"}<ListVideo class="h-3.5 w-3.5" />{:else}<FileText class="h-3.5 w-3.5" />{/if}
                  Resume
                </div>
                <h3 class="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow md:text-[15px]">{e.title}</h3>
              </div>
              <div class="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                <div class="h-full bg-white" style={`width: ${e.pct}%; background: hsl(${e.hue} 80% 65%)`}></div>
              </div>
            </div>
          </a>
        {/each}
      </div>

      <button
        type="button"
        onclick={() => scroll(-1)}
        disabled={atStart}
        aria-label="Scroll left"
        class="absolute left-2 top-[calc(50%-1rem)] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 opacity-0 shadow-lg backdrop-blur transition hover:bg-accent group-hover/row:opacity-100 disabled:pointer-events-none disabled:opacity-0 md:flex"
      >
        <ChevronLeft class="h-5 w-5" />
      </button>
      <button
        type="button"
        onclick={() => scroll(1)}
        disabled={atEnd}
        aria-label="Scroll right"
        class="absolute right-2 top-[calc(50%-1rem)] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-background/90 opacity-0 shadow-lg backdrop-blur transition hover:bg-accent group-hover/row:opacity-100 disabled:pointer-events-none disabled:opacity-0 md:flex"
      >
        <ChevronRight class="h-5 w-5" />
      </button>
    </div>
  </section>
{/if}
