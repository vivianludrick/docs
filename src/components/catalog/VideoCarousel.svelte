<script lang="ts">
  /**
   * Single-video player with left/right arrows. Shows one YouTube video at a time;
   * thumbnails only until the reader presses play (no iframes on load).
   */
  import { Play, ChevronLeft, ChevronRight } from "lucide-svelte";
  import { cn } from "../../lib/utils";

  type Video = { id: string; title?: string; duration?: string };
  let {
    videos,
    hue = 220,
    size = "md",
  }: { videos: Video[]; hue?: number; size?: "sm" | "md" | "lg" } = $props();

  let index = $state(0);
  let playing = $state(false);
  const current = $derived(videos[index]);
  const many = $derived(videos.length > 1);
  const maxW = { sm: "max-w-2xl", md: "max-w-3xl", lg: "max-w-5xl" };

  function go(delta: 1 | -1) {
    index = (index + delta + videos.length) % videos.length;
    playing = false;
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") go(-1);
    else if (e.key === "ArrowRight") go(1);
  }
  const arrow =
    "hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-background/90 text-foreground shadow-md backdrop-blur transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 md:flex";

  // Swipe between videos on touch screens (arrows are hidden there).
  let touchX: number | null = null;
  function onTouchStart(e: TouchEvent) {
    touchX = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: TouchEvent) {
    if (touchX === null || !many) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    touchX = null;
  }
</script>

{#if current}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class={cn("mx-auto w-full", maxW[size])} role="region" aria-roledescription="carousel" aria-label="Videos" tabindex="0" onkeydown={onKey} ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
    <div class="flex items-center gap-2 md:gap-4">
      {#if many}
        <button type="button" class={arrow} onclick={() => go(-1)} aria-label="Previous video">
          <ChevronLeft class="h-5 w-5" />
        </button>
      {/if}

      <figure class="min-w-0 flex-1">
        {#key current.id}
          <div
            class="animate-in fade-in relative aspect-video overflow-hidden rounded-2xl border bg-black shadow-xl duration-300"
            style={`box-shadow: 0 20px 60px -20px hsl(${hue} 70% 50% / 0.45)`}
          >
            {#if playing}
              <iframe
                class="absolute inset-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${current.id}?autoplay=1&rel=0`}
                title={current.title ?? "YouTube video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            {:else}
              <button
                type="button"
                class="group/play absolute inset-0 h-full w-full"
                onclick={() => (playing = true)}
                aria-label={`Play ${current.title ?? "video"}`}
              >
                <img
                  src={`https://i.ytimg.com/vi/${current.id}/maxresdefault.jpg`}
                  onerror={(e) => ((e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${current.id}/hqdefault.jpg`)}
                  alt=""
                  loading="lazy"
                  class="h-full w-full object-cover opacity-90 transition duration-500 group-hover/play:scale-[1.03] group-hover/play:opacity-100"
                />
                <span class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-transparent to-transparent">
                  <span class="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-xl transition group-hover/play:scale-110">
                    <Play class="ml-1 h-7 w-7" fill="currentColor" />
                  </span>
                </span>
                {#if current.duration}
                  <span class="absolute bottom-3 right-3 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] text-white">{current.duration}</span>
                {/if}
              </button>
            {/if}
          </div>
        {/key}
        <figcaption class="mt-3 flex items-center justify-between gap-3 text-sm">
          <span class="truncate font-medium">{current.title ?? ""}</span>
          {#if many}
            <span class="shrink-0 font-mono text-xs text-muted-foreground">{index + 1} / {videos.length}</span>
          {/if}
        </figcaption>
      </figure>

      {#if many}
        <button type="button" class={arrow} onclick={() => go(1)} aria-label="Next video">
          <ChevronRight class="h-5 w-5" />
        </button>
      {/if}
    </div>

    {#if many}
      <div class="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Choose video">
        {#each videos as v, i (v.id)}
          <button
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={v.title ?? `Video ${i + 1}`}
            onclick={() => { index = i; playing = false; }}
            class={cn("h-1.5 rounded-full transition-all", i === index ? "w-6 bg-foreground" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground")}
          ></button>
        {/each}
      </div>
    {/if}
  </div>
{/if}
