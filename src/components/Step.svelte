<script lang="ts">
  import type { Snippet } from "svelte";
  import { Check } from "lucide-svelte";

  let { title, children }: { title: string; children?: Snippet } = $props();
  let done = $state(false);
</script>

<div class="step">
  <div class="flex items-start justify-between gap-4">
    <h4 class="m-0 text-base font-semibold" class:line-through={done} class:text-muted-foreground={done}>
      {title}
    </h4>
    <button
      type="button"
      onclick={() => (done = !done)}
      aria-pressed={done}
      class="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground data-[done=true]:border-primary data-[done=true]:bg-primary data-[done=true]:text-primary-foreground"
      data-done={done}
    >
      <Check class="h-3 w-3" />
      {done ? "Done" : "Mark done"}
    </button>
  </div>
  {#if children}
    <div class="mt-2 text-muted-foreground [&>p]:my-2">
      {@render children()}
    </div>
  {/if}
</div>
