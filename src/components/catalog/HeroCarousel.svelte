<script lang="ts">
  /**
   * Auto-rotating hero (8s). Copy morphs between slides with Torph; banners cross-fade.
   * Arrows on both sides + dot indicators; any manual change restarts the timer.
   * Rotation never pauses on hover (like a streaming home page); it only stops while the tab is hidden.
   */
  import { onMount } from "svelte";
  import { TextMorph } from "torph/svelte";
  import { ListVideo, FileText, ArrowRight, ChevronLeft, ChevronRight } from "lucide-svelte";
  import BookmarkButton from "../BookmarkButton.svelte";
  import TagChips from "./TagChips.svelte";
  import type { HeroSlide } from "./hero";

  let { slides, cta = "Start reading", interval = 8000 }: { slides: HeroSlide[]; cta?: string; interval?: number } =
    $props();

  let index = $state(0);
  const current = $derived(slides[index]);
  // Torph renders only on the client, so serve plain text until hydrated (and if JS fails).
  // Its word boxes also wrap poorly at phone widths, so morph only from the md breakpoint up.
  let mounted = $state(false);
  let wide = $state(false);
  const useMorph = $derived(mounted && wide);
  const morph = { duration: 650, ease: "cubic-bezier(0.19, 1, 0.22, 1)" } as const;

  let timer: ReturnType<typeof setInterval> | undefined;
  function schedule() {
    clearInterval(timer);
    if (slides.length < 2) return;
    timer = setInterval(() => {
      if (!document.hidden) index = (index + 1) % slides.length;
    }, interval);
  }
  function go(i: number) {
    index = (i + slides.length) % slides.length;
    schedule();
  }

  onMount(() => {
    mounted = true;
    const mq = matchMedia("(min-width: 48rem)");
    wide = mq.matches;
    const onMq = (e: MediaQueryListEvent) => (wide = e.matches);
    mq.addEventListener("change", onMq);
    schedule();
    return () => {
      clearInterval(timer);
      mq.removeEventListener("change", onMq);
    };
  });

  const arrow =
    "flex h-10 w-10 items-center justify-center rounded-full border bg-background/60 text-foreground shadow-lg backdrop-blur transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
</script>

<section class="relative flex min-h-[70vh] items-end overflow-hidden" style={`--hue: ${current.hue}`} aria-roledescription="carousel">
  {#each slides as s, i (s.href)}
    <img
      src={s.banner}
      alt=""
      class="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out"
      class:opacity-0={i !== index}
      fetchpriority={i === 0 ? "high" : "auto"}
    />
  {/each}
  <div class="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-background/10"></div>
  <div class="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent"></div>
  <div
    aria-hidden="true"
    class="pointer-events-none absolute -bottom-24 left-1/4 h-72 w-[40rem] -translate-x-1/2 rounded-full blur-3xl transition-colors duration-1000"
    style={`background: hsl(${current.hue} 70% 55% / 0.22)`}
  ></div>

  <div class="relative mx-auto w-full max-w-screen-2xl px-4 pb-16 pt-36 md:px-8 md:pb-20">
    <div class="hero-copy max-w-2xl">
      <div class="flex items-center gap-2 text-xs font-medium">
        <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 backdrop-blur">
          {#if current.kind === "playlist"}<ListVideo class="h-3.5 w-3.5" />{:else}<FileText class="h-3.5 w-3.5" />{/if}
          {#if useMorph}<TextMorph text={current.meta} {...morph} />{:else}{current.meta}{/if}
        </span>
        {#key index}<TagChips tags={current.tags} class="animate-in fade-in duration-500" />{/key}
      </div>

      <div class="hero-block">
      <h1 class="hero-title mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
        {#if useMorph}
          <TextMorph text={current.title} {...morph} />
        {:else}
          {#key index}<span class="line-clamp-2 animate-in fade-in duration-500">{current.title}</span>{/key}
        {/if}
      </h1>
      <p class="hero-desc mt-4 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">
        {#if useMorph}
          <TextMorph text={current.description ?? ""} {...morph} />
        {:else}
          {#key index}<span class="line-clamp-2 animate-in fade-in duration-500">{current.description ?? ""}</span>{/key}
        {/if}
      </p>

      <div class="mt-7 flex flex-wrap gap-3">
        <a
          href={current.href}
          class="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 hover:shadow-[0_12px_32px_-8px_hsl(var(--hue)_70%_50%/0.6)]"
        >
          {cta} <ArrowRight class="h-4 w-4" />
        </a>
        {#key current.key}
          <BookmarkButton href={current.key} title={current.title} variant="pill" class="animate-in fade-in duration-500" />
        {/key}
      </div>
      </div>
    </div>

    {#if slides.length > 1}
      <div class="mt-10 flex items-center justify-between gap-6">
      <div class="flex items-center gap-2" role="tablist" aria-label="Featured">
        {#each slides as s, i (s.href)}
          <button
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show ${s.title}`}
            onclick={() => go(i)}
            class="relative h-1.5 overflow-hidden rounded-full transition-all duration-300 {i === index
              ? 'w-10 bg-foreground/30'
              : 'w-3 bg-foreground/30 hover:bg-foreground/60'}"
          >
            {#if i === index}
              {#key index}
                <span class="hero-fill absolute inset-y-0 left-0 rounded-full bg-foreground" style={`animation-duration: ${interval}ms`}></span>
              {/key}
            {/if}
          </button>
        {/each}
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class={arrow} onclick={() => go(index - 1)} aria-label="Previous featured">
          <ChevronLeft class="h-5 w-5" />
        </button>
        <span class="font-mono text-xs text-muted-foreground tabular-nums">{index + 1} / {slides.length}</span>
        <button type="button" class={arrow} onclick={() => go(index + 1)} aria-label="Next featured">
          <ChevronRight class="h-5 w-5" />
        </button>
      </div>
      </div>
    {/if}
  </div>
</section>

<style>
  /* Torph pins its root to a single line; the hero copy must wrap inside its column. */
  .hero-copy :global([torph-root]) {
    white-space: normal;
    max-width: 100%;
  }
  /* Title and description clamp to two lines (ellipsis on the second). Applied to Torph's
     root because the heading/paragraph itself only sees one atomic inline box. */
  .hero-title :global([torph-root]),
  .hero-desc :global([torph-root]) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
  }
  /* Fixed-height block = 2 title lines + 2 description lines + buttons, top-aligned, so a
     one-line title leaves its spare room below the buttons instead of between the lines. */
  .hero-block {
    min-height: 14rem;
  }
  @media (min-width: 40rem) {
    .hero-block {
      min-height: 15.5rem;
    }
  }
  @media (min-width: 48rem) {
    .hero-block {
      min-height: 17.25rem;
    }
  }
  .hero-fill {
    width: 0;
    animation-name: hero-fill;
    animation-timing-function: linear;
    animation-fill-mode: forwards;
  }
  @keyframes hero-fill {
    to {
      width: 100%;
    }
  }
</style>
