<script lang="ts">
  import { onMount } from "svelte";
  import { Search as SearchIcon, FileText } from "lucide-svelte";
  import { cn } from "../lib/utils";

  type Doc = { title: string; description: string; href: string; section: string; body: string };
  let { base = "" }: { base?: string } = $props();
  const b = base.replace(/\/$/, "");

  let open = $state(false);
  let query = $state("");
  let docs = $state<Doc[]>([]);
  let selected = $state(0);
  let input = $state<HTMLInputElement | null>(null);

  const results = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs.slice(0, 8);
    const terms = q.split(/\s+/);
    return docs
      .map((d) => {
        const hay = `${d.title} ${d.description} ${d.section}`.toLowerCase();
        const body = d.body.toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (d.title.toLowerCase().includes(t)) score += 10;
          if (hay.includes(t)) score += 4;
          if (body.includes(t)) score += 1;
        }
        return { d, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => r.d);
  });

  async function load() {
    if (docs.length) return;
    const res = await fetch(`${b}/search.json`);
    docs = await res.json();
  }

  async function show() {
    open = true;
    selected = 0;
    await load();
    queueMicrotask(() => input?.focus());
  }

  function go(d: Doc) {
    open = false;
    location.href = `${b}${d.href}`;
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open ? (open = false) : show();
      } else if (e.key === "Escape") open = false;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onInputKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); selected = Math.min(selected + 1, results.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); selected = Math.max(selected - 1, 0); }
    else if (e.key === "Enter" && results[selected]) go(results[selected]);
  }
</script>

<button
  type="button"
  onclick={show}
  class="inline-flex h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground transition hover:bg-accent md:w-64"
>
  <SearchIcon class="h-4 w-4" />
  <span class="flex-1 text-left">Search docs…</span>
  <kbd class="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
</button>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm" onclick={() => (open = false)}>
    <div
      class="animate-in fade-in zoom-in-95 mx-auto mt-[12vh] w-[min(640px,92vw)] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="flex items-center gap-2 border-b px-3">
        <SearchIcon class="h-4 w-4 text-muted-foreground" />
        <input
          bind:this={input}
          bind:value={query}
          onkeydown={onInputKey}
          oninput={() => (selected = 0)}
          placeholder="Type to search…"
          class="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <ul class="thin-scroll max-h-80 overflow-y-auto p-2">
        {#each results as d, i}
          <li>
            <button
              type="button"
              onclick={() => go(d)}
              onmouseenter={() => (selected = i)}
              class={cn(
                "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left",
                selected === i && "bg-accent text-accent-foreground",
              )}
            >
              <FileText class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium">{d.title}</span>
                <span class="block truncate text-xs text-muted-foreground">{d.section}{d.description ? ` · ${d.description}` : ""}</span>
              </span>
            </button>
          </li>
        {:else}
          <li class="px-3 py-6 text-center text-sm text-muted-foreground">No results.</li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
