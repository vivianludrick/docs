<script lang="ts">
  /**
   * Toggle a bookmark for `href` (base-less path).
   * variant "pill": hero-sized rounded button with label. "icon": compact square icon button.
   */
  import { onMount } from "svelte";
  import { Bookmark, BookmarkCheck } from "lucide-svelte";
  import { bookmarks, loadBookmarks, toggleBookmark } from "../lib/bookmarks.svelte";
  import { cn } from "../lib/utils";

  let {
    href,
    title,
    variant = "icon",
    class: className = "",
  }: { href: string; title: string; variant?: "pill" | "icon"; class?: string } = $props();

  onMount(loadBookmarks);
  const saved = $derived(href in bookmarks);
  let pulse = $state(false);

  function toggle() {
    const now = toggleBookmark(href, title);
    if (now) {
      pulse = true;
      setTimeout(() => (pulse = false), 350);
    }
  }
</script>

{#if variant === "pill"}
  <button
    type="button"
    onclick={toggle}
    aria-pressed={saved}
    class={cn(
      "inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold backdrop-blur transition",
      saved ? "border-primary/40 bg-primary/15 text-foreground hover:bg-primary/25" : "bg-background/60 hover:bg-accent",
      className,
    )}
  >
    {#if saved}
      <BookmarkCheck class={cn("h-4 w-4", pulse && "animate-in zoom-in-50 duration-300")} />
      Bookmarked
    {:else}
      <Bookmark class="h-4 w-4" />
      Bookmark
    {/if}
  </button>
{:else}
  <button
    type="button"
    onclick={toggle}
    aria-pressed={saved}
    aria-label={saved ? "Remove bookmark" : "Bookmark this page"}
    title={saved ? "Remove bookmark" : "Bookmark this page"}
    class={cn(
      "inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background/60 backdrop-blur transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      saved ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      className,
    )}
    style={saved ? "color: var(--doc-accent, var(--primary))" : ""}
  >
    {#if saved}
      <BookmarkCheck class={cn("h-4 w-4", pulse && "animate-in zoom-in-50 duration-300")} />
    {:else}
      <Bookmark class="h-4 w-4" />
    {/if}
  </button>
{/if}
