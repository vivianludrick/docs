<script lang="ts">
  import { onMount } from "svelte";
  import { Settings } from "lucide-svelte";
  import { loadSettings, emit, EVENTS } from "../lib/settings.svelte";

  onMount(loadSettings);
</script>

<button
  type="button"
  class="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  onclick={() => emit(EVENTS.openSettings)}
  aria-label="Settings"
  title="Settings"
>
  <Settings class="h-4 w-4" />
</button>
