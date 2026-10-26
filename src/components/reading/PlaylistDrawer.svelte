<script lang="ts">
  /**
   * Popout playlist sidebar: a floating "Playlist" tab on the LEFT edge (the Contents
   * tab lives on the right) opens a slide-in drawer listing every doc in the playlist.
   * Press `p` to toggle.
   */
  import { onMount } from "svelte";
  import { ListVideo, X, Clock, Play, ArrowUpRight } from "lucide-svelte";
  import { cn } from "../../lib/utils";

  type Doc = { id: string; title: string; href: string; readingMinutes?: number; hasVideo?: boolean };
  let {
    title,
    href,
    docs,
    current,
    hue = 220,
    base = "",
  }: { title: string; href: string; docs: Doc[]; current: string; hue?: number; base?: string } = $props();

  const b = base.replace(/\/$/, "");
  const full = (p: string) => `${b}${p}`;
  const accent = `hsl(${hue} 75% 55%)`;
  const index = $derived(docs.findIndex((d) => d.href === current));
  const total = $derived(docs.reduce((n, d) => n + (d.readingMinutes ?? 0), 0));

  let open = $state(false);
  let panel = $state<HTMLElement | null>(null);
  let lastFocus: HTMLElement | null = null;

  function toggle() {
    open = !open;
    if (open) {
      lastFocus = document.activeElement as HTMLElement;
      queueMicrotask(() => panel?.querySelector<HTMLElement>("[aria-current='page']")?.focus());
    } else lastFocus?.focus();
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.closest("input, textarea, select, [contenteditable]") !== null);
      if (e.key === "Escape" && open) { open = false; lastFocus?.focus(); }
      else if (e.key === "p" && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggle(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
</script>

{#if docs.length > 1}
  {#if !open}
    <button
      type="button"
      onclick={toggle}
      aria-label="Open playlist"
      title="Playlist (p)"
      class="fixed z-40 flex items-center text-muted-foreground shadow-md backdrop-blur transition hover:bg-accent hover:text-foreground max-md:bottom-5 max-md:left-5 max-md:h-12 max-md:w-12 max-md:justify-center max-md:rounded-full max-md:border max-md:bg-popover/90 md:left-0 md:top-1/2 md:-translate-y-1/2 md:flex-col md:gap-2 md:rounded-r-lg md:border md:border-l-0 md:bg-popover/90 md:px-1.5 md:py-3"
    >
      <ListVideo class="h-4 w-4" />
      <span class="hidden text-[10px] font-semibold uppercase tracking-widest md:inline" style="writing-mode: vertical-rl">
        Playlist
      </span>
      <span class="hidden font-mono text-[10px] md:inline">{index + 1}/{docs.length}</span>
    </button>
  {/if}

  {#if open}
    <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
    <div class="fixed inset-0 z-40 bg-background/40 backdrop-blur-[1px] animate-in fade-in duration-150" onclick={toggle}></div>
    <aside
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-label="Playlist"
      class="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[88vw] flex-col border-r bg-popover/95 shadow-2xl backdrop-blur animate-in duration-200 md:slide-in-from-left max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:max-h-[72dvh] max-md:w-full max-md:max-w-none max-md:rounded-t-2xl max-md:border-t max-md:border-x-0 max-md:slide-in-from-bottom max-md:pb-[env(safe-area-inset-bottom)]"
    >
      <div class="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border md:hidden" aria-hidden="true"></div>
      <div class="flex items-start justify-between gap-2 px-4 pt-4 pb-3">
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Playlist</p>
          <a href={full(href)} class="group mt-0.5 inline-flex max-w-full items-center gap-1 text-sm font-semibold hover:underline">
            <span class="truncate">{title}</span>
            <ArrowUpRight class="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
          </a>
          <p class="mt-0.5 text-xs text-muted-foreground">{docs.length} parts · {total} min</p>
        </div>
        <button
          type="button"
          onclick={toggle}
          aria-label="Close"
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
      <div class="mx-4 h-px bg-border" aria-hidden="true">
        <div class="h-full" style={`width: ${((index + 1) / docs.length) * 100}%; background: ${accent}`}></div>
      </div>

      <ol class="thin-scroll flex-1 overflow-y-auto px-2 py-3">
        {#each docs as d, i (d.id)}
          {@const isCurrent = d.href === current}
          <li>
            <a
              href={full(d.href)}
              aria-current={isCurrent ? "page" : undefined}
              class={cn(
                "flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition hover:bg-accent",
                isCurrent ? "bg-accent/60 font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]"
                style={isCurrent
                  ? `background: ${accent}; border-color: transparent; color: white`
                  : i < index
                    ? `background: hsl(${hue} 70% 50% / 0.15); border-color: hsl(${hue} 70% 50% / 0.35)`
                    : ""}
              >
                {i + 1}
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate">{d.title}</span>
                <span class="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                  {#if d.readingMinutes}<span class="inline-flex items-center gap-1"><Clock class="h-3 w-3" />{d.readingMinutes} min</span>{/if}
                  {#if d.hasVideo}<span class="inline-flex items-center gap-1"><Play class="h-3 w-3" fill="currentColor" />video</span>{/if}
                </span>
              </span>
            </a>
          </li>
        {/each}
      </ol>
      <p class="border-t px-4 py-2.5 text-[11px] text-muted-foreground">
        Press <kbd class="rounded border px-1 font-mono text-[10px]">p</kbd> to toggle
      </p>
    </aside>
  {/if}
{/if}
