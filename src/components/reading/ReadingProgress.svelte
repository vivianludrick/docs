<script lang="ts">
  /**
   * 2px reading-progress bar pinned above the header. Tracks how far the reader has
   * scrolled through the article element and persists it to localStorage["docs:progress"]
   * as { [href]: { title, pct, at } } (max 20 most recent) for the dashboard's
   * "Continue reading" row.
   */
  import { onMount } from "svelte";

  let {
    hue = 220,
    title,
    href,
    target = "#article",
  }: { hue?: number; title: string; href: string; target?: string } = $props();

  const STORAGE_KEY = "docs:progress";
  const MAX_ENTRIES = 20;
  const HEADER_OFFSET = 64;

  let pct = $state(0);
  let sessionMax = 0;
  let lastSaved = -1;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  type Entry = { title: string; pct: number; at: number };

  function persist(value: number) {
    if (value === lastSaved) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const map: Record<string, Entry> = raw ? JSON.parse(raw) : {};
      map[href] = { title, pct: value, at: Date.now() };
      const trimmed = Object.fromEntries(
        Object.entries(map)
          .sort((a, b) => b[1].at - a[1].at)
          .slice(0, MAX_ENTRIES),
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      lastSaved = value;
    } catch {}
  }

  function scheduleSave(value: number) {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persist(value);
    }, 1000);
  }

  onMount(() => {
    const el = document.querySelector<HTMLElement>(target);
    if (!el) return;

    let ticking = false;
    const measure = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const bottom = top + rect.height;
      const start = top - HEADER_OFFSET;
      const end = bottom - window.innerHeight;
      let p: number;
      if (end <= start) {
        p = window.scrollY + window.innerHeight >= bottom - 8 ? 100 : 0;
      } else {
        p = ((window.scrollY - start) / (end - start)) * 100;
      }
      if (window.scrollY + window.innerHeight >= bottom - 8) p = 100;
      p = Math.round(Math.min(100, Math.max(0, p)));
      pct = p;
      if (p > sessionMax) {
        sessionMax = p;
        if (p >= 1) scheduleSave(p);
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(measure);
    };
    const flush = () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      if (sessionMax >= 1) persist(sessionMax);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  });
</script>

<div
  class="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
  role="progressbar"
  aria-label="Reading progress"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={pct}
>
  <div
    class="h-full origin-left transition-transform duration-150 ease-out"
    style={`transform: scaleX(${pct / 100}); background: hsl(${hue} 75% 55%); box-shadow: 0 0 8px hsl(${hue} 75% 55% / 0.6);`}
  ></div>
</div>
