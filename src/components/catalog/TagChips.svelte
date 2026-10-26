<script lang="ts">
  /**
   * Tag chips that never wrap: shows as many as fit on one line, then a "+N" chip.
   * Clicking "+N" opens a popover listing every tag; each links to its tag page.
   */
  import { onMount, tick } from "svelte";
  import { X } from "lucide-svelte";
  import { cn } from "../../lib/utils";

  type Tag = { label: string; href: string };
  let { tags, class: className = "" }: { tags: Tag[]; class?: string } = $props();

  let row = $state<HTMLDivElement | null>(null);
  let measure = $state<HTMLDivElement | null>(null);
  let visible = $state(tags.length);
  let open = $state(false);
  let popover = $state<HTMLDivElement | null>(null);

  const hidden = $derived(tags.length - visible);
  const chip =
    "inline-flex shrink-0 items-center rounded-full bg-secondary/80 px-2.5 py-1 text-secondary-foreground transition hover:bg-secondary";

  async function fit() {
    if (!row || !measure) return;
    await tick();
    const max = row.clientWidth;
    const chips = Array.from(measure.children) as HTMLElement[];
    const more = chips.pop(); // last child is the "+N" template
    const moreW = (more?.offsetWidth ?? 0) + 8;
    let used = 0;
    let n = 0;
    for (let i = 0; i < chips.length; i++) {
      const w = chips[i].offsetWidth + (i ? 8 : 0);
      const needMore = i < chips.length - 1 ? moreW : 0;
      if (used + w + needMore > max) break;
      used += w;
      n = i + 1;
    }
    // If everything fits without the overflow chip, show all.
    const total = chips.reduce((s, c, i) => s + c.offsetWidth + (i ? 8 : 0), 0);
    visible = total <= max ? chips.length : n;
  }

  onMount(() => {
    fit();
    const ro = new ResizeObserver(() => fit());
    if (row) ro.observe(row);
    const onDoc = (e: MouseEvent) => {
      if (open && popover && !popover.contains(e.target as Node)) open = false;
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (open = false);
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      ro.disconnect();
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  });
  $effect(() => {
    void tags;
    fit();
  });
</script>

{#if tags.length}
  <div bind:this={row} class={cn("relative min-w-0 flex-1", className)}>
    <!-- hidden measuring copy -->
    <div bind:this={measure} class="pointer-events-none invisible absolute left-0 top-0 flex gap-2 whitespace-nowrap" aria-hidden="true">
      {#each tags as t (t.label)}<span class={chip}>#{t.label}</span>{/each}
      <span class={chip}>+{tags.length}</span>
    </div>

    <div class="flex items-center gap-2 overflow-hidden whitespace-nowrap">
      {#each tags.slice(0, visible) as t (t.label)}
        <a href={t.href} class={chip}>#{t.label}</a>
      {/each}
      {#if hidden > 0}
        <button
          type="button"
          class={cn(chip, "font-semibold", open && "bg-secondary")}
          onclick={() => (open = !open)}
          aria-expanded={open}
          aria-haspopup="dialog"
          title={`${hidden} more tag${hidden === 1 ? "" : "s"}`}
        >
          +{hidden}
        </button>
      {/if}
    </div>

    {#if open}
      <div
        bind:this={popover}
        role="dialog"
        aria-label="All tags"
        class="animate-in fade-in zoom-in-95 absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-3 text-popover-foreground shadow-xl duration-150"
      >
        <div class="mb-2 flex items-center justify-between">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Tags</span>
          <button type="button" onclick={() => (open = false)} aria-label="Close" class="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>
        <div class="flex flex-wrap gap-2">
          {#each tags as t (t.label)}
            <a href={t.href} class={chip}>#{t.label}</a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
