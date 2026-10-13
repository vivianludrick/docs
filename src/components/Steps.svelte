<script lang="ts">
  import type { Snippet } from "svelte";
  /**
   * Step counter. Wrap <Step> children (or plain <h3>s) and each gets an
   * auto-incremented number in the gutter. Numbering is pure CSS so it works
   * without JS; the component adds optional progress tracking on click.
   */
  let { title, children }: { title?: string; children: Snippet } = $props();
</script>

<section class="my-8">
  {#if title}
    <h3 class="mb-4 text-xl font-semibold tracking-tight">{title}</h3>
  {/if}
  <div class="steps">
    {@render children()}
  </div>
</section>
