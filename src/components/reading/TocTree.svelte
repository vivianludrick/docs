<script lang="ts">
  /**
   * Heading list with a connected "tree rail": one SVG path runs down the left, stepping
   * right for deeper headings with rounded bends, and the segment leading into the active
   * heading is drawn in the accent colour with a dot at its end.
   */
  import { tick } from "svelte";
  import { cn } from "../../lib/utils";

  type Heading = { depth: number; slug: string; text: string };
  let {
    items,
    active,
    accent,
    compact = false,
    onJump,
  }: { items: Heading[]; active: string | null; accent: string; compact?: boolean; onJump?: () => void } = $props();

  const X: Record<number, number> = { 2: 8, 3: 24, 4: 40 };
  const INSET = 3; // px trimmed from each item's top/bottom so segments read as separate

  let container = $state<HTMLDivElement | null>(null);
  let links: HTMLAnchorElement[] = [];
  let baseEl = $state<SVGPathElement | null>(null);
  let prefixEl = $state<SVGPathElement | null>(null);
  let activeEl = $state<SVGPathElement | null>(null);

  let basePath = $state("");
  let prefixPath = $state(""); // rail from the start up to where the active segment begins
  let activePath = $state(""); // the active segment itself (connector in + its own line)
  let size = $state({ w: 48, h: 0 });

  // Dash window along the base path: [prefixLen, prefixLen + activeLen]. Animating the dash
  // and the dot along the SAME geometry keeps them in lockstep.
  let total = $state(0);
  let prefixLen = $state(0);
  let activeLen = $state(0);
  let dot = $state<{ x: number; y: number } | null>(null);

  type Seg = { x: number; top: number; bottom: number; slug: string };

  function connector(a: Seg, b: Seg) {
    return a.x === b.x
      ? `L ${b.x} ${b.top}`
      : `C ${a.x} ${(a.bottom + b.top) / 2} ${b.x} ${(a.bottom + b.top) / 2} ${b.x} ${b.top}`;
  }

  function measure() {
    if (!container) return;
    const c = container.getBoundingClientRect();
    const segs: Seg[] = links.filter(Boolean).map((a, i) => {
      const r = a.getBoundingClientRect();
      return {
        x: X[items[i].depth] ?? 8,
        top: r.top - c.top + INSET,
        bottom: r.bottom - c.top - INSET,
        slug: items[i].slug,
      };
    });
    size = { w: 48, h: c.height };
    if (!segs.length) {
      basePath = prefixPath = activePath = "";
      dot = null;
      return;
    }

    let d = `M ${segs[0].x} ${segs[0].top}`;
    const atEnd: string[] = []; // path prefix ending at each segment's bottom
    segs.forEach((seg, i) => {
      d += ` L ${seg.x} ${seg.bottom}`;
      atEnd.push(d);
      if (segs[i + 1]) d += ` ${connector(seg, segs[i + 1])}`;
    });
    basePath = d;

    const current = active ?? items[0]?.slug ?? null;
    const ai = segs.findIndex((seg) => seg.slug === current);
    if (ai < 0) {
      prefixPath = activePath = "";
      dot = null;
      return;
    }
    const seg = segs[ai];
    const prev = segs[ai - 1];
    prefixPath = prev ? atEnd[ai - 1] : `M ${seg.x} ${seg.top}`;
    activePath = prev ? `M ${prev.x} ${prev.bottom} ${connector(prev, seg)} L ${seg.x} ${seg.bottom}` : `M ${seg.x} ${seg.top} L ${seg.x} ${seg.bottom}`;

    // Lengths need the <path> elements updated first.
    tick().then(() => {
      if (!baseEl) return;
      total = baseEl.getTotalLength();
      prefixLen = prefixEl?.getTotalLength() ?? 0;
      activeLen = activeEl?.getTotalLength() ?? 0;
      const pt = baseEl.getPointAtLength(prefixLen + activeLen);
      dot = { x: pt.x, y: pt.y };
    });
  }

  $effect(() => {
    // Re-measure whenever the list or the active heading changes, after the DOM settles.
    void items;
    void active;
    tick().then(measure);
  });
  $effect(() => {
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  });
</script>

<div bind:this={container} class="relative">
  <svg
    aria-hidden="true"
    class="pointer-events-none absolute left-0 top-0 overflow-visible"
    width={size.w}
    height={size.h}
    viewBox={`0 0 ${size.w} ${size.h}`}
    fill="none"
  >
    <path bind:this={baseEl} d={basePath} stroke="var(--border)" stroke-width="1.5" stroke-linecap="round" />
    <!-- measurement-only paths -->
    <path bind:this={prefixEl} d={prefixPath} stroke="none" />
    <path bind:this={activeEl} d={activePath} stroke="none" />
    {#if activePath && total > 0}
      <path
        d={basePath}
        stroke={accent}
        stroke-width="2"
        stroke-linecap="round"
        stroke-dasharray={`${activeLen} ${total}`}
        stroke-dashoffset={-prefixLen}
        class="rail-active"
      />
    {/if}
    {#if dot}
      <circle cx={dot.x} cy={dot.y} r="3" fill={accent} class="rail-dot" />
    {/if}
  </svg>
  <ul class={cn("space-y-0.5", compact ? "text-xs" : "text-sm")}>
    {#each items as h, i (h.slug)}
      <li>
        <a
          bind:this={links[i]}
          href={`#${h.slug}`}
          onclick={onJump}
          aria-current={(active ?? items[0]?.slug) === h.slug ? "location" : undefined}
          class={cn(
            "block rounded-md py-1.5 pr-2 leading-snug text-muted-foreground transition hover:text-foreground",
            !compact && "hover:bg-accent/60",
            h.depth === 2 && "pl-5",
            h.depth === 3 && "pl-9",
            h.depth >= 4 && "pl-[3.25rem]",
            h.depth === 3 && !compact && "text-[0.92em]",
            (active ?? items[0]?.slug) === h.slug && "font-medium text-foreground",
          )}
        >
          {h.text}
        </a>
      </li>
    {/each}
  </ul>
</div>

<style>
  .rail-active {
    transition:
      stroke-dasharray 300ms cubic-bezier(0.4, 0, 0.2, 1),
      stroke-dashoffset 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .rail-dot {
    transition:
      cx 300ms cubic-bezier(0.4, 0, 0.2, 1),
      cy 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
