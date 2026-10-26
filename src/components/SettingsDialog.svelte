<script lang="ts">
  /**
   * Settings dialog: appearance (theme / mode / reading font) and AI assistant
   * (provider, model, API key). Opened by the `docs:open-settings` window event.
   * Appearance changes apply instantly; AI settings are saved explicitly.
   */
  import { onMount, tick } from "svelte";
  import { X, Sun, Moon, Monitor, Check, Eye, EyeOff, Palette, Sparkles, Type, RefreshCw } from "lucide-svelte";
  import { cn } from "../lib/utils";
  import {
    prefs,
    ai,
    savePrefs,
    saveAi,
    clearAiKey,
    loadSettings,
    THEMES,
    PROVIDERS,
    EVENTS,
    type Mode,
    type ThemeId,
    type Provider,
  } from "../lib/settings.svelte";

  const uid = $props.id();

  /* ---- Theme previews (bg, surface, accent, text) ---- */
  const PREVIEWS: Record<ThemeId, { light: string[]; dark: string[] }> = {
    default: { light: ["#ffffff", "#f5f5f5", "#171717", "#737373"], dark: ["#252525", "#333333", "#ebebeb", "#8f8f8f"] },
    catppuccin: { light: ["#eff1f5", "#ccd0da", "#8839ef", "#1e66f5"], dark: ["#1e1e2e", "#45475a", "#cba6f7", "#89b4fa"] },
    nord: { light: ["#eceff4", "#d8dee9", "#5e81ac", "#88c0d0"], dark: ["#2e3440", "#4c566a", "#88c0d0", "#81a1c1"] },
    ayu: { light: ["#fcfcfc", "#e0e3e6", "#ff9940", "#399ee6"], dark: ["#1f2430", "#343b4a", "#ffad66", "#73d0ff"] },
    dracula: { light: ["#fffbeb", "#e6e0c8", "#644ac9", "#a3144d"], dark: ["#282a36", "#44475a", "#bd93f9", "#ff79c6"] },
    "rose-pine": { light: ["#faf4ed", "#dfdad9", "#907aa9", "#d7827e"], dark: ["#232136", "#44415a", "#c4a7e7", "#ea9a97"] },
    "tokyo-night": { light: ["#e1e2e7", "#c4c8da", "#3760bf", "#9854f1"], dark: ["#1a1b26", "#3b4261", "#7aa2f7", "#bb9af7"] },
    gruvbox: { light: ["#fbf1c7", "#d5c4a1", "#af3a03", "#b57614"], dark: ["#282828", "#504945", "#fe8019", "#fabd2f"] },
  };

  const MODES: { id: Mode; label: string; icon: typeof Sun }[] = [
    { id: "auto", label: "Auto", icon: Monitor },
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
  ];
  const CUSTOM = "__custom__";

  /* ---- State ---- */
  let open = $state(false);
  let dialog = $state<HTMLDivElement | null>(null);
  let scrollBody = $state<HTMLDivElement | null>(null);
  let firstControl = $state<HTMLButtonElement | null>(null);
  let previouslyFocused: HTMLElement | null = null;

  let systemDark = $state(false);
  const darkPreview = $derived(prefs.mode === "dark" || (prefs.mode === "auto" && systemDark));

  let showKey = $state(false);
  let saved = $state(false);
  let savedTimer: ReturnType<typeof setTimeout> | undefined;
  let customModel = $state(false);

  const provider = $derived(PROVIDERS.find((p) => p.id === ai.provider) ?? PROVIDERS[0]);
  /** Models fetched live from the provider, keyed by provider id. */
  let fetched = $state<Record<string, string[]>>({});
  let fetching = $state(false);
  let fetchError = $state<string | null>(null);
  const modelOptions = $derived(fetched[ai.provider]?.length ? fetched[ai.provider] : provider.models);
  const isCustom = $derived(customModel || !modelOptions.includes(ai.model));

  async function fetchModels() {
    fetching = true;
    fetchError = null;
    try {
      const { listModels } = await import("../lib/models");
      const ids = await listModels({ provider: ai.provider, apiKey: ai.apiKey });
      if (!ids.length) throw new Error("No chat models returned for this key");
      fetched = { ...fetched, [ai.provider]: ids };
      if (!ids.includes(ai.model)) {
        ai.model = ids[0];
        customModel = false;
      }
    } catch (e) {
      fetchError = e instanceof Error ? e.message : "Could not fetch models";
    } finally {
      fetching = false;
    }
  }

  /* ---- Lifecycle ---- */
  onMount(() => {
    loadSettings();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    systemDark = mq.matches;
    const onMq = (e: MediaQueryListEvent) => (systemDark = e.matches);
    mq.addEventListener("change", onMq);
    window.addEventListener(EVENTS.openSettings, show);
    return () => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener(EVENTS.openSettings, show);
      document.body.style.overflow = "";
      clearTimeout(savedTimer);
    };
  });

  async function show() {
    if (open) return;
    previouslyFocused = document.activeElement as HTMLElement | null;
    open = true;
    document.body.style.overflow = "hidden";
    await tick();
    scrollBody?.scrollTo({ top: 0 });
    firstControl?.focus();
  }

  function close() {
    if (!open) return;
    open = false;
    document.body.style.overflow = "";
    previouslyFocused?.focus?.();
    previouslyFocused = null;
  }

  function focusables(): HTMLElement[] {
    if (!dialog) return [];
    return Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Tab") {
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !dialog?.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialog?.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  /* ---- Appearance ---- */
  function setTheme(id: ThemeId) {
    prefs.theme = id;
    savePrefs();
  }
  function setMode(m: Mode) {
    prefs.mode = m;
    savePrefs();
  }
  function setFont(f: "sans" | "serif") {
    prefs.font = f;
    savePrefs();
  }

  /* ---- AI ---- */
  function onProviderChange(e: Event) {
    const next = (e.currentTarget as HTMLSelectElement).value as Provider;
    const p = PROVIDERS.find((x) => x.id === next) ?? PROVIDERS[0];
    ai.provider = p.id;
    if (!customModel && !p.models.includes(ai.model)) ai.model = p.models[0];
  }
  function onModelChange(e: Event) {
    const v = (e.currentTarget as HTMLSelectElement).value;
    if (v === CUSTOM) {
      customModel = true;
      if (provider.models.includes(ai.model)) ai.model = "";
    } else {
      customModel = false;
      ai.model = v;
    }
  }
  function save() {
    if (isCustom && !ai.model.trim()) ai.model = provider.models[0];
    saveAi();
    saved = true;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => (saved = false), 1800);
  }
  function forget() {
    clearAiKey();
    showKey = false;
  }

  /* ---- Shared classes ---- */
  const segmentBtn =
    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const segmentOn = "bg-background text-foreground shadow-sm";
  const segmentOff = "text-muted-foreground hover:text-foreground";
  const field =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs transition placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
  const label = "text-xs font-medium text-muted-foreground";
  const btnBase =
    "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div class="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
    <button
      type="button"
      tabindex="-1"
      aria-label="Close settings"
      class="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
      onclick={close}
    ></button>

    <div
      bind:this={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby="{uid}-title"
      class="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border bg-popover text-popover-foreground shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-200 motion-reduce:animate-none sm:max-h-[85vh] sm:max-w-xl sm:rounded-xl sm:slide-in-from-bottom-0"
      style="box-shadow: 0 24px 64px -16px var(--brand-glow), 0 8px 24px rgb(0 0 0 / 0.2)"
    >
      <header class="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 id="{uid}-title" class="text-base font-semibold tracking-tight">Settings</h2>
          <p class="text-xs text-muted-foreground">Theme, reading preferences and the AI assistant.</p>
        </div>
        <button
          type="button"
          bind:this={firstControl}
          class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onclick={close}
          aria-label="Close"
        >
          <X class="h-4 w-4" />
        </button>
      </header>

      <div bind:this={scrollBody} class="thin-scroll flex-1 overflow-y-auto px-5 py-5">
        <!-- ============ Appearance ============ -->
        <section aria-labelledby="{uid}-appearance" class="space-y-5">
          <div class="flex items-center gap-2">
            <Palette class="h-4 w-4 text-muted-foreground" />
            <h3 id="{uid}-appearance" class="text-sm font-semibold">Appearance</h3>
          </div>

          <div class="space-y-2">
            <div class={label} id="{uid}-theme-label">Theme</div>
            <div role="radiogroup" aria-labelledby="{uid}-theme-label" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {#each THEMES as t (t.id)}
                {@const colors = darkPreview ? PREVIEWS[t.id].dark : PREVIEWS[t.id].light}
                {@const selected = prefs.theme === t.id}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onclick={() => setTheme(t.id)}
                  class={cn(
                    "group relative flex flex-col gap-2 rounded-lg border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selected ? "border-primary bg-accent/60 ring-1 ring-primary" : "hover:border-muted-foreground/40 hover:bg-accent/40",
                  )}
                >
                  <span
                    class="flex h-9 items-center justify-center gap-1.5 rounded-md border"
                    style="background: {colors[0]}; border-color: {colors[1]}"
                    aria-hidden="true"
                  >
                    {#each colors.slice(1) as c}
                      <span class="h-3 w-3 rounded-full ring-1 ring-black/10" style="background: {c}"></span>
                    {/each}
                  </span>
                  <span class="flex items-center justify-between text-xs font-medium">
                    {t.label}
                    {#if selected}
                      <Check class="h-3.5 w-3.5 text-primary" />
                    {/if}
                  </span>
                </button>
              {/each}
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <div class={label} id="{uid}-mode-label">Mode</div>
              <div role="radiogroup" aria-labelledby="{uid}-mode-label" class="flex gap-1 rounded-lg border bg-muted/60 p-1">
                {#each MODES as m (m.id)}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={prefs.mode === m.id}
                    onclick={() => setMode(m.id)}
                    class={cn(segmentBtn, prefs.mode === m.id ? segmentOn : segmentOff)}
                  >
                    <m.icon class="h-3.5 w-3.5" />
                    {m.label}
                  </button>
                {/each}
              </div>
            </div>

            <div class="space-y-2">
              <div class={label} id="{uid}-font-label">Reading font</div>
              <div role="radiogroup" aria-labelledby="{uid}-font-label" class="flex gap-1 rounded-lg border bg-muted/60 p-1">
                <button
                  type="button"
                  role="radio"
                  aria-checked={prefs.font === "sans"}
                  onclick={() => setFont("sans")}
                  class={cn(segmentBtn, "font-sans", prefs.font === "sans" ? segmentOn : segmentOff)}
                >
                  <Type class="h-3.5 w-3.5" />
                  Sans
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={prefs.font === "serif"}
                  onclick={() => setFont("serif")}
                  class={cn(segmentBtn, "font-serif", prefs.font === "serif" ? segmentOn : segmentOff)}
                >
                  <Type class="h-3.5 w-3.5" />
                  Serif
                </button>
              </div>
            </div>
          </div>
        </section>

        <hr class="my-6" />

        <!-- ============ AI assistant ============ -->
        <section aria-labelledby="{uid}-ai" class="space-y-4">
          <div class="flex items-center gap-2">
            <Sparkles class="h-4 w-4 text-muted-foreground" />
            <h3 id="{uid}-ai" class="text-sm font-semibold">AI assistant</h3>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class={label} for="{uid}-provider">Provider</label>
              <select id="{uid}-provider" class={field} value={ai.provider} onchange={onProviderChange}>
                {#each PROVIDERS as p (p.id)}
                  <option value={p.id}>{p.label}</option>
                {/each}
              </select>
            </div>

            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label class={label} for="{uid}-model">Model</label>
                <button
                  type="button"
                  onclick={fetchModels}
                  disabled={fetching}
                  class="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                  title="Ask the provider which models this key can use"
                >
                  <RefreshCw class={cn("h-3 w-3", fetching && "animate-spin")} />
                  {fetching ? "Fetching…" : fetched[ai.provider] ? "Refresh models" : "Fetch models"}
                </button>
              </div>
              <select id="{uid}-model" class={field} value={isCustom ? CUSTOM : ai.model} onchange={onModelChange}>
                {#each modelOptions as m (m)}
                  <option value={m}>{m}</option>
                {/each}
                <option value={CUSTOM}>Custom…</option>
              </select>
            </div>
          </div>

          {#if fetchError}
            <p class="text-xs text-destructive">{fetchError}</p>
          {:else if fetched[ai.provider]}
            <p class="text-xs text-muted-foreground">{fetched[ai.provider].length} models available to this key.</p>
          {/if}

          {#if isCustom}
            <div class="space-y-1.5">
              <label class={label} for="{uid}-custom-model">Custom model ID</label>
              <input
                id="{uid}-custom-model"
                type="text"
                class={cn(field, "font-mono")}
                placeholder={provider.models[0]}
                autocomplete="off"
                spellcheck="false"
                bind:value={ai.model}
              />
            </div>
          {/if}

          <div class="space-y-1.5">
            <label class={label} for="{uid}-key">API key</label>
            <div class="relative">
              <input
                id="{uid}-key"
                type={showKey ? "text" : "password"}
                class={cn(field, "pr-10 font-mono")}
                placeholder={provider.keyHint}
                autocomplete="off"
                spellcheck="false"
                bind:value={ai.apiKey}
              />
              <button
                type="button"
                class="absolute top-1/2 right-1 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onclick={() => (showKey = !showKey)}
                aria-label={showKey ? "Hide API key" : "Show API key"}
                aria-pressed={showKey}
              >
                {#if showKey}<EyeOff class="h-4 w-4" />{:else}<Eye class="h-4 w-4" />{/if}
              </button>
            </div>
            <p class="text-xs text-muted-foreground">
              Your key is sent directly from your browser to {provider.label} and never to this site.
            </p>
          </div>

          <label class="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              class="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              bind:checked={ai.persist}
            />
            <span>
              Remember my key on this device (localStorage)
              <span class="block text-xs text-muted-foreground">
                Unchecked keeps the key for this session only; it is cleared when the tab closes.
              </span>
            </span>
          </label>

          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class={cn(btnBase, "bg-primary text-primary-foreground hover:bg-primary/90")} onclick={save}>
              {#if saved}<Check class="h-4 w-4" /> Saved{:else}Save{/if}
            </button>
            <button
              type="button"
              class={cn(btnBase, "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground")}
              onclick={forget}
              disabled={!ai.apiKey}
            >
              Forget key
            </button>
            <span class="text-xs text-muted-foreground" role="status" aria-live="polite">
              {#if saved}Settings saved.{/if}
            </span>
          </div>
        </section>
      </div>

      <footer class="border-t px-5 py-3 text-center text-xs text-muted-foreground">
        Preferences are stored in your browser only.
      </footer>
    </div>
  </div>
{/if}
