<script lang="ts">
  /**
   * Client-side filter over a server-rendered grid. Cards are `[data-card]`
   * elements inside `#${target}` carrying data-title, data-tags (comma list), data-kind.
   * Matching toggles the `hidden` class; nothing is refetched.
   */
  import { onMount } from "svelte";
  import { Search, X, Tag, ChevronDown, Check } from "lucide-svelte";

  let { tags, target = "library-grid" }: { tags: [string, number][]; target?: string } = $props();

  type Kind = "all" | "doc" | "playlist";
  let q = $state("");
  let kind = $state<Kind>("all");
  let selected = $state<string[]>([]);
  let visible = $state(-1);
  let total = $state(0);

  // Tag dropdown
  let tagsOpen = $state(false);
  let tagQuery = $state("");
  let tagMenu = $state<HTMLDivElement | null>(null);
  let tagInput = $state<HTMLInputElement | null>(null);
  const filteredTags = $derived(
    tags.filter(([t]) => t.toLowerCase().includes(tagQuery.trim().toLowerCase())),
  );
  function openTags() {
    tagsOpen = !tagsOpen;
    if (tagsOpen) queueMicrotask(() => tagInput?.focus());
  }
  onMount(() => {
    const onDoc = (e: MouseEvent) => {
      if (tagsOpen && tagMenu && !tagMenu.contains(e.target as Node)) tagsOpen = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tagsOpen = false;
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  });

  function toggleTag(t: string) {
    selected = selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t];
  }
  function reset() {
    q = "";
    kind = "all";
    selected = [];
  }

  $effect(() => {
    const needle = q.trim().toLowerCase();
    const want = selected;
    const k = kind;
    const cards = document.querySelectorAll<HTMLElement>(`#${target} [data-card]`);
    let shown = 0;
    for (const el of cards) {
      const title = el.dataset.title?.toLowerCase() ?? "";
      const desc = el.dataset.description?.toLowerCase() ?? "";
      const cardTags = (el.dataset.tags ?? "").split(",").filter(Boolean);
      const ok =
        (k === "all" || el.dataset.kind === k) &&
        (!needle || title.includes(needle) || desc.includes(needle) || cardTags.some((t) => t.includes(needle))) &&
        want.every((t) => cardTags.includes(t));
      el.classList.toggle("hidden", !ok);
      if (ok) shown++;
    }
    total = cards.length;
    visible = shown;
    document.getElementById(`${target}-empty`)?.classList.toggle("hidden", shown > 0);
  });

  const active = $derived(q.trim() !== "" || kind !== "all" || selected.length > 0);
</script>

<div class="space-y-4">
  <div class="flex flex-col gap-3 md:flex-row md:items-center">
    <label class="relative flex-1">
      <Search class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        bind:value={q}
        placeholder="Filter by title, description or tag…"
        class="h-11 w-full rounded-full border bg-card pl-11 pr-10 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-2 focus:ring-ring/40"
      />
      {#if q}
        <button
          type="button"
          onclick={() => (q = "")}
          aria-label="Clear"
          class="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X class="h-4 w-4" />
        </button>
      {/if}
    </label>

  </div>

  {#if tags.length}
    <div class="flex flex-wrap items-center gap-2">
      <div bind:this={tagMenu} class="relative">
        <button
          type="button"
          onclick={openTags}
          aria-expanded={tagsOpen}
          aria-haspopup="listbox"
          class="inline-flex h-9 items-center gap-2 rounded-full border bg-card px-3.5 text-sm font-medium shadow-sm transition hover:border-foreground/30 {selected.length
            ? 'text-foreground'
            : 'text-muted-foreground hover:text-foreground'}"
        >
          <Tag class="h-3.5 w-3.5" />
          Tags
          {#if selected.length}
            <span class="rounded-full bg-primary px-1.5 py-0.5 font-mono text-[10px] leading-none text-primary-foreground">{selected.length}</span>
          {/if}
          <ChevronDown class="h-3.5 w-3.5 transition-transform {tagsOpen ? 'rotate-180' : ''}" />
        </button>

        {#if tagsOpen}
          <div
            role="listbox"
            aria-multiselectable="true"
            aria-label="Filter by tag"
            class="animate-in fade-in zoom-in-95 absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl duration-150"
          >
            <div class="flex items-center gap-2 border-b px-3">
              <Search class="h-3.5 w-3.5 text-muted-foreground" />
              <input
                bind:this={tagInput}
                bind:value={tagQuery}
                placeholder="Find a tag…"
                class="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <ul class="thin-scroll max-h-64 overflow-y-auto p-1.5">
              {#each filteredTags as [t, n] (t)}
                {@const on = selected.includes(t)}
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    onclick={() => toggleTag(t)}
                    class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-accent"
                  >
                    <span class="flex h-4 w-4 items-center justify-center rounded border {on ? 'border-primary bg-primary text-primary-foreground' : 'bg-background'}">
                      {#if on}<Check class="h-3 w-3" />{/if}
                    </span>
                    <span class="flex-1 truncate">#{t}</span>
                    <span class="font-mono text-[11px] text-muted-foreground">{n}</span>
                  </button>
                </li>
              {:else}
                <li class="px-2 py-4 text-center text-xs text-muted-foreground">No tags match.</li>
              {/each}
            </ul>
            {#if selected.length}
              <div class="border-t px-3 py-2">
                <button type="button" onclick={() => (selected = [])} class="text-xs font-medium text-muted-foreground hover:text-foreground">
                  Clear tags
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      {#each selected as t (t)}
        <button
          type="button"
          onclick={() => toggleTag(t)}
          aria-label={`Remove tag ${t}`}
          class="inline-flex items-center gap-1 rounded-full border border-foreground bg-foreground px-2.5 py-1 text-xs font-medium text-background transition hover:opacity-80"
        >
          #{t} <X class="h-3 w-3" />
        </button>
      {/each}

      {#if active}
        <button type="button" onclick={reset} class="ml-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <X class="h-3 w-3" /> Clear all
        </button>
      {/if}
    </div>
  {/if}

  {#if visible >= 0}
    <p class="text-xs text-muted-foreground" aria-live="polite">
      Showing {visible} of {total}
    </p>
  {/if}
</div>
