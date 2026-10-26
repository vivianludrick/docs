<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Sparkles, X, Settings, SquarePen, ArrowUp, Square, Bot } from "lucide-svelte";
  import { cn } from "../../lib/utils";
  import { ai, loadSettings, emit, EVENTS, PROVIDERS, getDocContext, type DocContext } from "../../lib/settings.svelte";
  import type { ChatMessage } from "../../lib/ai";

  type Msg = ChatMessage & { id: number };
  type AiModule = typeof import("../../lib/ai");
  type MarkdownRenderer = (src: string) => string;

  const MAX_MESSAGES = 40;
  const QUICK_PROMPTS = ["Summarize this page", "Explain like I'm new to this", "Give me a quiz", "What should I read next?"];

  let open = $state(false);
  let messages = $state<Msg[]>([]);
  let input = $state("");
  let streaming = $state(false);
  let error = $state<string | null>(null);
  let ctx = $state<DocContext | null>(null);
  let useCtx = $state(true);
  let renderMd = $state<MarkdownRenderer | null>(null);
  let listEl = $state<HTMLDivElement | null>(null);
  let textarea = $state<HTMLTextAreaElement | null>(null);

  let aiModule: AiModule | null = null;
  let controller: AbortController | null = null;
  let storageKey = "";
  let nextId = 1;

  const hasKey = $derived(ai.apiKey.trim().length > 0);
  const providerLabel = $derived(PROVIDERS.find((p) => p.id === ai.provider)?.label ?? ai.provider);
  const activeCtx = $derived(useCtx ? ctx : null);
  const canSend = $derived(hasKey && !streaming && input.trim().length > 0);

  /* ---- Persistence (per page, sessionStorage) ---- */
  function restore() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { messages?: Msg[]; useCtx?: boolean };
      messages = (saved.messages ?? []).filter((m) => m.content).map((m) => ({ ...m, id: nextId++ }));
      if (typeof saved.useCtx === "boolean") useCtx = saved.useCtx;
    } catch {}
  }
  function persist() {
    try {
      if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
      const payload = { messages: messages.map(({ role, content }) => ({ role, content })), useCtx };
      sessionStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  }

  /* ---- Markdown (lazy; raw HTML is escaped, links are sandboxed) ---- */
  async function ensureMarkdown() {
    if (renderMd) return;
    const { Marked } = await import("marked");
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const md = new Marked({
      gfm: true,
      breaks: true,
      renderer: {
        html({ text }) {
          return esc(text);
        },
        image({ text, href }) {
          return esc(text || href);
        },
        link({ href, title, tokens }) {
          const safe = /^(https?:|mailto:|#|\/|\.)/i.test(href) ? href : "#";
          const label = this.parser.parseInline(tokens);
          return `<a href="${esc(safe)}"${title ? ` title="${esc(title)}"` : ""} target="_blank" rel="noreferrer">${label}</a>`;
        },
      },
    });
    renderMd = (src) => md.parse(src, { async: false });
  }
  const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => `&#${c.charCodeAt(0)};`);
  function html(content: string) {
    return renderMd ? renderMd(content) : `<p>${escapeHtml(content)}</p>`;
  }

  /* ---- Panel ---- */
  async function openPanel() {
    open = true;
    void ensureMarkdown();
    await tick();
    textarea?.focus();
    scrollToBottom();
  }
  function closePanel() {
    open = false;
  }
  function newChat() {
    stop();
    messages = [];
    error = null;
    useCtx = true;
    input = "";
    persist();
    textarea?.focus();
  }
  function scrollToBottom() {
    if (listEl) listEl.scrollTop = listEl.scrollHeight;
  }

  /* ---- Sending ---- */
  async function send(text = input) {
    const content = text.trim();
    if (!content || streaming) return;
    if (!hasKey) {
      error = "Add an API key in Settings";
      return;
    }
    error = null;
    input = "";
    resizeTextarea();

    messages.push({ id: nextId++, role: "user", content });
    const reply: Msg = { id: nextId++, role: "assistant", content: "" };
    messages.push(reply);
    if (messages.length > MAX_MESSAGES) messages = messages.slice(-MAX_MESSAGES);
    persist();

    streaming = true;
    controller = new AbortController();
    const signal = controller.signal;
    const idx = messages.length - 1;

    try {
      aiModule ??= await import("../../lib/ai");
      await ensureMarkdown();
      const history = messages.slice(0, idx).map(({ role, content }) => ({ role, content }));
      for await (const delta of aiModule.streamChat({
        messages: history,
        settings: { ...ai },
        ctx: activeCtx,
        signal,
      })) {
        messages[idx].content += delta;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      streaming = false;
      controller = null;
      if (!messages[idx]?.content) messages.splice(idx, 1);
      persist();
    }
  }
  function stop() {
    controller?.abort();
  }

  /* ---- Composer ---- */
  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      void send();
    }
  }
  function resizeTextarea() {
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.max(32, Math.min(textarea.scrollHeight, 180))}px`;
  }
  $effect(() => {
    if (textarea) resizeTextarea();
  });

  /* ---- Lifecycle ---- */
  onMount(() => {
    loadSettings();
    ctx = getDocContext();
    storageKey = `docs:chat:${ctx?.href ?? location.pathname}`;
    restore();
    if (messages.length) void ensureMarkdown();

    const onOpen = () => void openPanel();
    const onAsk = async (e: Event) => {
      const text = String((e as CustomEvent<{ text?: string }>).detail?.text ?? "").trim();
      await openPanel();
      if (!text) return;
      input = `${text
        .split("\n")
        .map((l) => `> ${l}`)
        .join("\n")}\n\nExplain this`;
      await tick();
      resizeTextarea();
      textarea?.focus();
      textarea?.setSelectionRange(input.length, input.length);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) closePanel();
    };
    window.addEventListener(EVENTS.openChat, onOpen);
    window.addEventListener(EVENTS.askAi, onAsk);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(EVENTS.openChat, onOpen);
      window.removeEventListener(EVENTS.askAi, onAsk);
      window.removeEventListener("keydown", onKey);
      controller?.abort();
    };
  });

  // Keep the newest tokens in view while streaming.
  $effect(() => {
    const last = messages[messages.length - 1];
    void last?.content.length;
    void messages.length;
    if (open) scrollToBottom();
  });

  const iconBtn =
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
</script>

{#if !open}
  <button
    type="button"
    onclick={openPanel}
    aria-label="Ask AI about this page"
    title="Ask AI"
    class="fab animate-in fade-in zoom-in-90 fixed right-5 bottom-5 z-40 inline-flex h-12 w-12 max-md:left-1/2 max-md:right-auto max-md:-translate-x-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  >
    <Sparkles class="h-5 w-5" />
  </button>
{/if}

{#if open}
  <div
    role="dialog"
    aria-label="AI assistant"
    class="animate-in fixed z-50 flex flex-col bg-background text-foreground shadow-2xl duration-200 max-md:inset-0 max-md:slide-in-from-bottom md:inset-y-0 md:right-0 md:w-[420px] md:border-l md:slide-in-from-right"
  >
    <!-- Header -->
    <header class="flex items-start gap-2 border-b px-4 py-3">
      <div class="min-w-0 flex-1">
        <h2 class="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles class="h-4 w-4 shrink-0" />
          {ctx ? "Ask about this page" : "Ask anything"}
        </h2>
        {#if ctx}
          <p class="truncate text-xs text-muted-foreground" title={ctx.title}>{ctx.title}</p>
        {/if}
        <button
          type="button"
          onclick={() => emit(EVENTS.openSettings)}
          class="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
          title="Change model in Settings"
        >
          <span class="truncate">{providerLabel} · {ai.model || "no model"}</span>
        </button>
      </div>
      <div class="flex items-center">
        <button type="button" class={iconBtn} onclick={newChat} aria-label="New chat" title="New chat">
          <SquarePen class="h-4 w-4" />
        </button>
        <button type="button" class={iconBtn} onclick={() => emit(EVENTS.openSettings)} aria-label="Settings" title="Settings">
          <Settings class="h-4 w-4" />
        </button>
        <button type="button" class={iconBtn} onclick={closePanel} aria-label="Close" title="Close (Esc)">
          <X class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!-- Messages -->
    <div bind:this={listEl} class="thin-scroll flex-1 overflow-y-auto px-4 py-4">
      {#if !hasKey}
        <div class="flex h-full flex-col items-center justify-center gap-3 text-center">
          <div class="flex h-12 w-12 items-center justify-center rounded-full border bg-muted">
            <Sparkles class="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p class="text-sm font-medium">Bring your own API key</p>
            <p class="mt-1 max-w-[28ch] text-xs text-muted-foreground">
              Requests go straight from your browser to the provider. Nothing is sent anywhere else.
            </p>
          </div>
          <button
            type="button"
            onclick={() => emit(EVENTS.openSettings)}
            class="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            <Settings class="h-4 w-4" /> Add API key
          </button>
        </div>
      {:else if messages.length === 0}
        <div class="flex h-full flex-col justify-end gap-3">
          <p class="text-sm text-muted-foreground">
            {#if activeCtx}
              I've read <span class="font-medium text-foreground">{activeCtx.title}</span>. Ask me anything about it.
            {:else}
              Ask me anything. Markdown and code are welcome.
            {/if}
          </p>
          {#if activeCtx}
            <div class="flex flex-wrap gap-2">
              {#each QUICK_PROMPTS as q (q)}
                <button
                  type="button"
                  onclick={() => send(q)}
                  class="rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {q}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {:else}
        <ol class="flex flex-col gap-4">
          {#each messages as m, i (m.id)}
            {@const isLast = i === messages.length - 1}
            <li class={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              {#if m.role === "user"}
                <div class="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
                  {m.content}
                </div>
              {:else}
                <div class="flex max-w-full gap-2.5">
                  <div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-muted">
                    <Bot class="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div class="prose-chat min-w-0 flex-1 text-sm">
                    {#if streaming && isLast && !m.content}
                      <span class="thinking mt-2 inline-flex items-center gap-1" aria-label="Thinking">
                        <i></i><i></i><i></i>
                      </span>
                    {:else}
                      {@html html(m.content)}{#if streaming && isLast}<span class="cursor" aria-hidden="true"></span>{/if}
                    {/if}
                  </div>
                </div>
              {/if}
            </li>
          {/each}
        </ol>
      {/if}

      {#if error}
        <div
          role="alert"
          class="mt-4 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground"
        >
          <span class="flex-1">{error}</span>
          {#if /api key/i.test(error)}
            <button type="button" class="shrink-0 font-medium underline underline-offset-2" onclick={() => emit(EVENTS.openSettings)}>
              Open settings
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Composer -->
    <footer class="border-t px-3 pt-2 pb-3">
      {#if ctx}
        <div class="mb-2 flex items-center">
          {#if useCtx}
            <span class="inline-flex max-w-full items-center gap-1 rounded-full border bg-muted py-0.5 pr-1 pl-2.5 text-[11px] text-muted-foreground">
              <span class="truncate">Context: <span class="text-foreground">{ctx.title}</span></span>
              <button
                type="button"
                onclick={() => {
                  useCtx = false;
                  persist();
                }}
                aria-label="Drop page context for this chat"
                title="Drop page context"
                class="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-accent hover:text-foreground"
              >
                <X class="h-3 w-3" />
              </button>
            </span>
          {:else}
            <button
              type="button"
              onclick={() => {
                useCtx = true;
                persist();
              }}
              class="rounded-full border border-dashed px-2.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Use this page as context
            </button>
          {/if}
        </div>
      {/if}
      <form
        class="flex items-end gap-2 rounded-xl border bg-card py-2 pr-2 pl-3 focus-within:ring-2 focus-within:ring-ring/60"
        onsubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          bind:this={textarea}
          bind:value={input}
          oninput={resizeTextarea}
          onkeydown={onKeydown}
          disabled={streaming || !hasKey}
          rows="1"
          placeholder={hasKey ? (activeCtx ? "Ask about this page…" : "Ask anything…") : "Add an API key in Settings to start"}
          class="thin-scroll max-h-[180px] min-h-[32px] flex-1 resize-none bg-transparent py-1 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-60"
        ></textarea>
        {#if streaming}
          <button
            type="button"
            onclick={stop}
            aria-label="Stop generating"
            title="Stop"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-background text-foreground transition hover:bg-accent"
          >
            <Square class="h-3.5 w-3.5 fill-current" />
          </button>
        {:else}
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            title="Send (Enter)"
            class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
          >
            <ArrowUp class="h-4 w-4" />
          </button>
        {/if}
      </form>
      <p class="mt-1.5 px-1 text-[10px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
    </footer>
  </div>
{/if}

<style>
  .fab {
    box-shadow:
      0 1px 2px color-mix(in oklab, var(--foreground) 20%, transparent),
      0 8px 28px -6px var(--brand-glow, var(--primary));
  }
  .fab:hover {
    box-shadow:
      0 1px 2px color-mix(in oklab, var(--foreground) 20%, transparent),
      0 10px 36px -4px var(--brand-glow, var(--primary));
  }

  .cursor {
    display: inline-block;
    width: 0.5em;
    height: 1em;
    margin-left: 0.15em;
    vertical-align: text-bottom;
    background: var(--foreground);
    border-radius: 1px;
    animation: blink 1s steps(2, start) infinite;
  }
  @keyframes blink {
    to {
      visibility: hidden;
    }
  }

  .thinking i {
    width: 5px;
    height: 5px;
    border-radius: 9999px;
    background: var(--muted-foreground);
    animation: thinking 1.2s ease-in-out infinite;
  }
  .thinking i:nth-child(2) {
    animation-delay: 0.15s;
  }
  .thinking i:nth-child(3) {
    animation-delay: 0.3s;
  }
  @keyframes thinking {
    0%,
    80%,
    100% {
      opacity: 0.25;
      transform: translateY(0);
    }
    40% {
      opacity: 1;
      transform: translateY(-2px);
    }
  }

  /* Compact markdown for assistant replies. Rendered via {@html}, so :global is required. */
  .prose-chat {
    line-height: 1.6;
    overflow-wrap: anywhere;
  }
  .prose-chat :global(> :first-child) {
    margin-top: 0;
  }
  .prose-chat :global(> :last-child) {
    margin-bottom: 0;
  }
  .prose-chat :global(p) {
    margin: 0.5rem 0;
  }
  .prose-chat :global(h1),
  .prose-chat :global(h2),
  .prose-chat :global(h3),
  .prose-chat :global(h4) {
    margin: 1rem 0 0.4rem;
    font-weight: 600;
    line-height: 1.3;
    letter-spacing: -0.01em;
  }
  .prose-chat :global(h1) {
    font-size: 1.1rem;
  }
  .prose-chat :global(h2) {
    font-size: 1.02rem;
  }
  .prose-chat :global(h3),
  .prose-chat :global(h4) {
    font-size: 0.95rem;
  }
  .prose-chat :global(ul),
  .prose-chat :global(ol) {
    margin: 0.5rem 0;
    padding-left: 1.25rem;
  }
  .prose-chat :global(ul) {
    list-style: disc;
  }
  .prose-chat :global(ol) {
    list-style: decimal;
  }
  .prose-chat :global(li) {
    margin: 0.2rem 0;
  }
  .prose-chat :global(li > ul),
  .prose-chat :global(li > ol) {
    margin: 0.15rem 0;
  }
  .prose-chat :global(a) {
    color: var(--primary);
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 3px;
    text-decoration-color: color-mix(in oklab, var(--muted-foreground) 40%, transparent);
  }
  .prose-chat :global(a:hover) {
    text-decoration-color: var(--primary);
  }
  .prose-chat :global(strong) {
    font-weight: 600;
  }
  .prose-chat :global(blockquote) {
    margin: 0.6rem 0;
    padding-left: 0.75rem;
    border-left: 2px solid var(--border);
    color: var(--muted-foreground);
  }
  .prose-chat :global(hr) {
    margin: 0.8rem 0;
    border-color: var(--border);
  }
  .prose-chat :global(:not(pre) > code) {
    padding: 0.1rem 0.3rem;
    border-radius: 0.3rem;
    background: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.85em;
    font-weight: 500;
  }
  .prose-chat :global(pre) {
    margin: 0.6rem 0;
    padding: 0.6rem 0.75rem;
    overflow-x: auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--muted);
    font-size: 12.5px;
    line-height: 1.5;
    scrollbar-width: thin;
  }
  .prose-chat :global(pre code) {
    padding: 0;
    background: transparent;
    font-family: var(--font-mono);
    font-weight: 400;
  }
  .prose-chat :global(table) {
    width: 100%;
    margin: 0.6rem 0;
    border-collapse: collapse;
    font-size: 0.85em;
  }
  .prose-chat :global(th),
  .prose-chat :global(td) {
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--border);
    text-align: left;
  }
  .prose-chat :global(th) {
    background: var(--muted);
    font-weight: 600;
  }
</style>
