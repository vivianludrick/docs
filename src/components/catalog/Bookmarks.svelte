<script lang="ts">
  /**
   * Bookmarked items from localStorage["docs:bookmarks"], rendered as a rail (home)
   * or a grid (/bookmarks). `items` maps base-less href -> card data for banners.
   */
  import { onMount } from "svelte";
  import { ChevronLeft, ChevronRight, FileText, ListVideo, Bookmark, X } from "lucide-svelte";
  import { bookmarks, loadBookmarks, bookmarkList, toggleBookmark } from "../../lib/bookmarks.svelte";
  import { cn } from "../../lib/utils";

  type Meta = { title: string; banner: string; hue: number; kind: "doc" | "playlist"; description?: string };
  let {
    items,
    base = "/",
    layout = "rail",
    limit = 12,
  }: { items: Record<string, Meta>; base?: string; layout?: "rail" | "grid"; limit?: number } = $props();

  const prefix = base.replace(/\/$/, "");
  onMount(loadBookmarks);

  const entries = $derived(
    bookmarkList()
      .map((b) => {
        const meta = items[b.href];
        return {
          key: b.href,
          href: `${prefix}${b.href}`,
          title: meta?.title ?? b.title,
          description: meta?.description,
          banner: meta?.banner ?? "",
          hue: meta?.hue ?? 220,
          kind: meta?.kind ?? ("doc" as const),
          at: b.at,
        };
      })
      .slice(0, layout === "rail" ? limit : undefined),
  );
  // Touch `bookmarks` so the derived re-runs when the store changes.
  $effect(() => void Object.keys(bookmarks).length);

  let rail = $state<HTMLDivElement | null>(null);
  let atStart = $state(true);
  let atEnd = $state(true);
  function update() {
    if (!rail) return;
    atStart = rail.scrollLeft <= 4;
    atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 4;
  }
  function scroll(dir: 1 | -1) {
    rail?.scrollBy({ left: dir * Math.max(rail.clientWidth * 0.8, 200), behavior: "smooth" });
  }
  $effect(() => {
    if (entries.length) queueMicrotask(update);
  });

  const card =
    "group relative block transform-gpu outline-none transition-transform duration-300 ease-out will-change-transform hover:z-10 hover:-translate-y-1 hover:scale-[1.03] focus-visible:scale-[1.03]";
</script>

{#snippet tile(e: (typeof entries)[number])}
  <div class="relative">
    <a href={e.href} class={card} style={`--glow: hsl(${e.hue} 70% 50% / 0.4)`}>
      <div
        class="relative aspect-video overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/0 transition-shadow duration-300 ease-out group-hover:shadow-[0_20px_40px_-12px_var(--glow)] group-hover:ring-foreground/15 group-focus-visible:ring-2 group-focus-visible:ring-ring"
      >
        {#if e.banner}
          <img src={e.banner} alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover" />
        {:else}
          <div class="absolute inset-0" style={`background: hsl(${e.hue} 50% 25%)`}></div>
        {/if}
        <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/5"></div>
        <div class="absolute inset-x-0 bottom-0 p-3 pb-4">
          <div class="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-white/70">
            {#if e.kind === "playlist"}<ListVideo class="h-3.5 w-3.5" />{:else}<FileText class="h-3.5 w-3.5" />{/if}
            {e.kind === "playlist" ? "Playlist" : "Article"}
          </div>
          <h3 class="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow md:text-[15px]">{e.title}</h3>
        </div>
      </div>
      {#if layout === "grid" && e.description}
        <p class="mt-2 line-clamp-2 text-sm text-muted-foreground">{e.description}</p>
      {/if}
    </a>
    <button
      type="button"
      onclick={() => toggleBookmark(e.key, e.title)}
      aria-label={`Remove bookmark: ${e.title}`}
      title="Remove bookmark"
      class="absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md bg-black/65 text-white opacity-0 backdrop-blur-sm transition hover:bg-black/85 focus-visible:opacity-100 group-hover:opacity-100 [div:hover>&]:opacity-100"
    >
      <X class="h-3.5 w-3.5" />
    </button>
  </div>
{/snippet}

{#if layout === "grid"}
  {#if entries.length}
    <div class="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {#each entries as e (e.key)}
        {@render tile(e)}
      {/each}
    </div>
  {:else}
    <div class="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed px-6 py-16 text-center">
      <span class="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Bookmark class="h-5 w-5 text-muted-foreground" /></span>
      <h2 class="mt-4 text-lg font-semibold">No bookmarks yet</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Use the bookmark button on any article or on the home page hero. They're saved in this browser.
      </p>
    </div>
  {/if}
{:else if entries.length}
  <section class="group/row">
    <div class="mx-auto flex max-w-screen-2xl items-baseline justify-between px-4 md:px-8">
      <h2 class="text-lg font-bold tracking-tight md:text-xl">Bookmarks</h2>
      <a href={`${prefix}/bookmarks`} class="text-sm font-medium text-muted-foreground transition hover:text-foreground">See all →</a>
    </div>
    <div class="relative">
      <div
        bind:this={rail}
        onscroll={update}
        class="mx-auto flex max-w-screen-2xl snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-10 pt-4 [scrollbar-width:none] md:scroll-pl-8 md:gap-4 md:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {#each entries as e (e.key)}
          <div class="w-[70vw] shrink-0 snap-start sm:w-[280px]">
            {@render tile(e)}
          </div>
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
