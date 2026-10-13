<script lang="ts">
  /** Tiny interactive demo to prove Svelte islands hydrate inside markdown. */
  let { start = 0 }: { start?: number } = $props();
  let count = $state(start);
</script>

<div class="my-6 inline-flex items-center gap-3 rounded-lg border bg-card p-3">
  <button
    type="button"
    class="h-8 w-8 rounded-md border hover:bg-accent"
    onclick={() => count--}>−</button
  >
  <span class="min-w-8 text-center font-mono text-lg tabular-nums">{count}</span>
  <button
    type="button"
    class="h-8 w-8 rounded-md bg-primary text-primary-foreground hover:opacity-90"
    onclick={() => count++}>+</button
  >
</div>
