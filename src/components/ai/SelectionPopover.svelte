<script lang="ts">
  import { onMount } from "svelte";
  import { Sparkles, Copy, Check } from "lucide-svelte";
  import { emit, EVENTS } from "../../lib/settings.svelte";

  const MIN_CHARS = 8;
  const MAX_CHARS = 8000;
  const GAP = 8;

  let visible = $state(false);
  let text = $state("");
  let rect = $state({ top: 0, bottom: 0, left: 0, width: 0 });
  let popW = $state(0);
  let popH = $state(0);
  let copied = $state(false);

  let popEl = $state<HTMLDivElement | null>(null);
  let dragging = false;
  let raf = 0;
  let copiedTimer = 0;

  const left = $derived.by(() => {
    const centre = rect.left + rect.width / 2;
    const max = Math.max(GAP, window.innerWidth - popW - GAP);
    return Math.min(Math.max(centre - popW / 2, GAP), max);
  });
  const top = $derived.by(() => {
    const above = rect.top - popH - GAP;
    return above >= GAP ? above : Math.min(rect.bottom + GAP, window.innerHeight - popH - GAP);
  });

  function hide() {
    visible = false;
    copied = false;
  }

  function selectedInProse(sel: Selection): string | null {
    if (sel.isCollapsed || sel.rangeCount === 0) return null;
    const inProse = (n: Node | null) => {
      const el = n?.nodeType === Node.TEXT_NODE ? n.parentElement : (n as Element | null);
      return !!el?.closest?.(".prose");
    };
    if (!inProse(sel.anchorNode) || !inProse(sel.focusNode)) return null;
    const t = sel.toString().trim();
    return t.length >= MIN_CHARS ? t : null;
  }

  function update() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const sel = getSelection();
      const t = sel ? selectedInProse(sel) : null;
      if (!t || dragging) {
        if (!t) hide();
        return;
      }
      const r = sel!.getRangeAt(0).getBoundingClientRect();
      if (!r.width && !r.height) {
        hide();
        return;
      }
      text = t.length > MAX_CHARS ? `${t.slice(0, MAX_CHARS)}…` : t;
      rect = { top: r.top, bottom: r.bottom, left: r.left, width: r.width };
      copied = false;
      visible = true;
    });
  }

  function ask() {
    const t = text;
    hide();
    getSelection()?.removeAllRanges();
    emit(EVENTS.askAi, { text: t });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      clearTimeout(copiedTimer);
      copiedTimer = window.setTimeout(hide, 900);
    } catch {
      hide();
    }
  }

  onMount(() => {
    // Only article pages have selectable prose; elsewhere this island stays inert.
    if (!document.querySelector(".prose")) return;

    const onMouseDown = (e: MouseEvent) => {
      if (popEl?.contains(e.target as Node)) return;
      dragging = true;
      hide();
    };
    const onMouseUp = () => {
      dragging = false;
      update();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
      else update();
    };
    const onScroll = () => visible && hide();

    document.addEventListener("selectionchange", update);
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keyup", onKeyUp);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", hide);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(copiedTimer);
      document.removeEventListener("selectionchange", update);
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", hide);
    };
  });

  const btn =
    "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
</script>

{#if visible}
  <div
    bind:this={popEl}
    bind:clientWidth={popW}
    bind:clientHeight={popH}
    role="toolbar"
    aria-label="Selection actions"
    style="top:{top}px;left:{left}px"
    class="animate-in fade-in zoom-in-95 fixed z-50 flex items-center gap-0.5 rounded-full border bg-popover p-1 text-popover-foreground shadow-lg duration-150"
  >
    <button type="button" class="{btn} text-foreground" onmousedown={(e) => e.preventDefault()} onclick={ask}>
      <Sparkles class="h-3.5 w-3.5" />
      Ask AI
    </button>
    <span class="h-4 w-px bg-border" aria-hidden="true"></span>
    <button
      type="button"
      class="{btn} text-muted-foreground"
      onmousedown={(e) => e.preventDefault()}
      onclick={copy}
      aria-label={copied ? "Copied" : "Copy selection"}
    >
      {#if copied}
        <Check class="h-3.5 w-3.5" />
        Copied
      {:else}
        <Copy class="h-3.5 w-3.5" />
        Copy
      {/if}
    </button>
  </div>
{/if}
