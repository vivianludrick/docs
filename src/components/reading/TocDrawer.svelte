<script lang="ts">
  /**
   * Popout table of contents.
   * - A floating "Contents" tab on the right edge opens a slide-in drawer (any screen).
   * - On ≥xl the same headings also render as a quiet sticky mini-TOC in the right gutter
   *   (this component must be mounted inside a `relative` wrapper around the article).
   * - `t` toggles the drawer, Escape / backdrop closes it.
   */
  import { onMount } from "svelte";
  import { List, X } from "lucide-svelte";
  import { cn } from "../../lib/utils";
  import TocTree from "./TocTree.svelte";

  type Heading = { depth: number; slug: string; text: string };
  let {
    headings,
    hue = 220,
    target = "#article",
  }: { headings: Heading[]; hue?: number; target?: string } = $props();

  const items = $derived(headings.filter((h) => h.depth >= 2 && h.depth <= 3));
  let open = $state(false);
  let active = $state<string | null>(null);
  let pct = $state(0);
  let drawer = $state<HTMLElement | null>(null);

  const accent = $derived(`hsl(${hue} 72% 55%)`);

  function toggle() {
    open = !open;
  }
  function close() {
    open = false;
  }
  function onJump() {
    // Mobile / tablet: the drawer covers the page, so close it after jumping.
    if (!matchMedia("(min-width: 80rem)").matches) close();
  }

  function isTypingTarget(t: EventTarget | null) {
    const el = t as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
  }

  onMount(() => {
    const els = items.map((h) => document.getElementById(h.slug)).filter((e): e is HTMLElement => !!e);
    if (location.hash) active = decodeURIComponent(location.hash.slice(1));

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          active = visible[0].target.id;
          return;
        }
        // Nothing in the band: pick the last heading above the viewport.
        let last: string | null = null;
        for (const el of els) {
          if (el.getBoundingClientRect().top < 96) last = el.id;
          else break;
        }
        if (last) active = last;
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] },
    );
    els.forEach((el) => io.observe(el));

    const article = document.querySelector<HTMLElement>(target);
    let ticking = false;
    const measure = () => {
      ticking = false;
      if (!article) return;
      const rect = article.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const end = top + rect.height - window.innerHeight;
      const start = top - 64;
      const p = end <= start ? 100 : ((window.scrollY - start) / (end - start)) * 100;
      pct = Math.min(100, Math.max(0, p));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "t" && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
    };
  });

  $effect(() => {
    if (open) drawer?.querySelector<HTMLElement>("a, button")?.focus();
  });
</script>

{#snippet list(compact: boolean)}
  <TocTree {items} {active} {accent} {compact} {onJump} />
{/snippet}

{#if items.length}
  <!-- Desktop mini-TOC in the right gutter -->
  <div class="absolute bottom-0 left-full top-0 ml-12 hidden w-52 xl:block" aria-hidden={open}>
    <nav aria-label="On this page" class="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto thin-scroll pr-2">
      <p class="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">On this page</p>
      {@render list(true)}
      <button
        type="button"
        onclick={toggle}
        class="mt-4 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/70 transition hover:text-foreground"
      >
        <List class="h-3 w-3" /> Expand <kbd class="rounded border px-1 font-mono text-[10px]">t</kbd>
      </button>
    </nav>
  </div>

  <!-- Floating edge tab -->
  {#if !open}
    <button
      type="button"
      onclick={toggle}
      aria-label="Open table of contents"
      title="Contents (t)"
      class="fixed z-40 flex items-center text-muted-foreground shadow-md backdrop-blur transition hover:bg-accent hover:text-foreground max-md:right-5 max-md:bottom-5 max-md:h-12 max-md:w-12 max-md:justify-center max-md:rounded-full max-md:border max-md:bg-popover/90 md:right-0 md:top-1/2 md:-translate-y-1/2 md:flex-col md:gap-2 md:rounded-l-lg md:border md:border-r-0 md:bg-popover/90 md:px-1.5 md:py-3"
    >
      <List class="h-4 w-4" />
      <span class="hidden text-[10px] font-semibold uppercase tracking-widest md:inline" style="writing-mode: vertical-rl; transform: rotate(180deg)">
        Contents
      </span>
    </button>
  {/if}

  <!-- Drawer -->
  {#if open}
    <div
      class="fixed inset-0 z-40 bg-background/40 backdrop-blur-[1px] animate-in fade-in duration-150"
      onclick={close}
      aria-hidden="true"
    ></div>
    <aside
      bind:this={drawer}
      role="dialog"
      aria-modal="true"
      aria-label="Table of contents"
      class="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[88vw] flex-col border-l bg-popover/95 shadow-2xl backdrop-blur animate-in duration-200 md:slide-in-from-right max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:max-h-[72dvh] max-md:w-full max-md:max-w-none max-md:rounded-t-2xl max-md:border-t max-md:border-x-0 max-md:slide-in-from-bottom max-md:pb-[env(safe-area-inset-bottom)]"
    >
      <div class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border md:hidden" aria-hidden="true"></div>
      <div class="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <p class="text-sm font-semibold">Contents</p>
        <button
          type="button"
          onclick={close}
          aria-label="Close"
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
      <div class="mx-4 h-px bg-border" aria-hidden="true"></div>
      <nav aria-label="On this page" class="thin-scroll flex-1 overflow-y-auto px-2 py-3">
        {@render list(false)}
      </nav>
      <p class="border-t px-4 py-2.5 text-[11px] text-muted-foreground">
        {Math.round(pct)}% read · press <kbd class="rounded border px-1 font-mono text-[10px]">t</kbd> to toggle
      </p>
    </aside>
  {/if}
{/if}
