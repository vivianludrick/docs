<script lang="ts">
  import type { Snippet } from "svelte";
  import { Menu, X } from "lucide-svelte";
  let { children }: { children: Snippet } = $props();
  let open = $state(false);
</script>

<button
  type="button"
  class="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-accent lg:hidden"
  aria-label="Open navigation"
  onclick={() => (open = true)}
>
  <Menu class="h-4 w-4" />
</button>

{#if open}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm lg:hidden" onclick={() => (open = false)}>
    <aside
      class="animate-in slide-in-from-left thin-scroll h-full w-72 overflow-y-auto border-r bg-sidebar p-4"
      onclick={(e) => e.stopPropagation()}
    >
      <div class="mb-4 flex justify-end">
        <button type="button" aria-label="Close" onclick={() => (open = false)} class="rounded-md p-1 hover:bg-accent">
          <X class="h-4 w-4" />
        </button>
      </div>
      {@render children()}
    </aside>
  </div>
{/if}
