<script lang="ts">
  import { onMount } from "svelte";
  import { cn } from "../lib/utils";

  type Heading = { depth: number; slug: string; text: string };
  let { headings }: { headings: Heading[] } = $props();

  const items = $derived(headings.filter((h) => h.depth >= 2 && h.depth <= 3));
  let active = $state<string | null>(null);

  onMount(() => {
    const els = items
      .map((h) => document.getElementById(h.slug))
      .filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) active = visible[0].target.id;
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: [0, 1] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
</script>

{#if items.length}
  <nav aria-label="On this page" class="text-sm">
    <p class="mb-3 font-semibold">On this page</p>
    <ul class="space-y-1 border-l">
      {#each items as h}
        <li>
          <a
            href={`#${h.slug}`}
            class={cn(
              "-ml-px block border-l py-1 text-muted-foreground transition hover:text-foreground",
              h.depth === 3 ? "pl-6" : "pl-3",
              active === h.slug && "border-primary font-medium text-foreground",
            )}
          >
            {h.text}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
{/if}
