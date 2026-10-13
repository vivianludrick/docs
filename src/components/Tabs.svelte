<script lang="ts">
  import type { Snippet } from "svelte";
  import { cn } from "../lib/utils";

  /** Usage: <Tabs items={["pnpm","npm"]}>{#snippet panel(i)} ... {/snippet}</Tabs> in Svelte,
   *  or from MDX pass `panels` as an array of rendered strings. */
  let {
    items,
    panel,
    children,
  }: { items: string[]; panel?: Snippet<[number]>; children?: Snippet } = $props();
  let active = $state(0);
</script>

<div class="my-6 rounded-lg border">
  <div role="tablist" class="flex gap-1 border-b bg-muted/50 p-1">
    {#each items as item, i}
      <button
        role="tab"
        type="button"
        aria-selected={active === i}
        onclick={() => (active = i)}
        class={cn(
          "rounded-md px-3 py-1.5 text-sm font-medium transition",
          active === i ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
      >
        {item}
      </button>
    {/each}
  </div>
  <div class="p-4 [&>pre]:my-0">
    {#if panel}
      {@render panel(active)}
    {:else if children}
      <div data-active={active}>{@render children()}</div>
    {/if}
  </div>
</div>
