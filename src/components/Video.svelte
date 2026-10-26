<script lang="ts">
  /** Inline video block for .mdx docs: <Video id="…" title="…" client:visible />  */
  import VideoCarousel from "./catalog/VideoCarousel.svelte";
  let { id, title, duration }: { id: string; title?: string; duration?: string } = $props();
</script>

<div class="my-8">
  <VideoCarousel videos={[{ id, title, duration }]} size="md" />
</div>
