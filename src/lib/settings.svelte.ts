/**
 * Global user preferences (theme, mode, AI provider) as Svelte 5 rune state.
 * Theme + mode always live in localStorage. The AI key lives in localStorage only
 * when the user opts in (`persist`), otherwise sessionStorage.
 *
 * The <html> element gets `data-theme="<ThemeId>"` and the `dark` class; an inline
 * script in BaseLayout applies both before first paint using the same storage keys.
 */
export type Mode = "light" | "dark" | "auto";
export type ThemeId =
  | "default"
  | "catppuccin"
  | "nord"
  | "ayu"
  | "dracula"
  | "rose-pine"
  | "tokyo-night"
  | "gruvbox";
export type Provider = "google" | "openai" | "anthropic" | "openrouter";

export interface AiSettings {
  provider: Provider;
  model: string;
  apiKey: string;
  persist: boolean; // true = localStorage, false = sessionStorage
}
export interface Prefs {
  theme: ThemeId;
  mode: Mode;
  /** Reading font for articles. */
  font: "sans" | "serif";
}

export const PREFS_KEY = "docs:prefs";
export const AI_KEY = "docs:ai";

export const THEMES: { id: ThemeId; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "catppuccin", label: "Catppuccin" },
  { id: "nord", label: "Nord" },
  { id: "ayu", label: "Ayu" },
  { id: "dracula", label: "Dracula" },
  { id: "rose-pine", label: "Rosé Pine" },
  { id: "tokyo-night", label: "Tokyo Night" },
  { id: "gruvbox", label: "Gruvbox" },
];

export const PROVIDERS: { id: Provider; label: string; models: string[]; keyHint: string }[] = [
  { id: "google", label: "Google Gemini", models: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"], keyHint: "AIza…" },
  { id: "openai", label: "OpenAI", models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "o4-mini"], keyHint: "sk-…" },
  { id: "anthropic", label: "Anthropic", models: ["claude-sonnet-5-5", "claude-haiku-4-5-20251001", "claude-opus-5-5"], keyHint: "sk-ant-…" },
  { id: "openrouter", label: "OpenRouter", models: ["google/gemini-2.5-flash", "openai/gpt-4.1-mini", "anthropic/claude-sonnet-4.5"], keyHint: "sk-or-…" },
];

const defaultPrefs: Prefs = { theme: "default", mode: "auto", font: "sans" };
const defaultAi: AiSettings = { provider: "google", model: "gemini-2.5-flash", apiKey: "", persist: false };

function read<T>(storage: Storage | undefined, key: string): Partial<T> | null {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<T>) : null;
  } catch {
    return null;
  }
}

export const prefs = $state<Prefs>({ ...defaultPrefs });
export const ai = $state<AiSettings>({ ...defaultAi });

let loaded = false;
/** Call once on the client (idempotent). */
export function loadSettings() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  Object.assign(prefs, read<Prefs>(localStorage, PREFS_KEY) ?? {});
  const persisted = read<AiSettings>(localStorage, AI_KEY);
  const session = read<AiSettings>(sessionStorage, AI_KEY);
  Object.assign(ai, persisted ? { ...persisted, persist: true } : session ? { ...session, persist: false } : {});
  applyTheme();
}

export function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {}
  applyTheme();
}

export function saveAi() {
  try {
    const json = JSON.stringify(ai);
    if (ai.persist) {
      localStorage.setItem(AI_KEY, json);
      sessionStorage.removeItem(AI_KEY);
    } else {
      sessionStorage.setItem(AI_KEY, json);
      localStorage.removeItem(AI_KEY);
    }
  } catch {}
}

export function clearAiKey() {
  ai.apiKey = "";
  try {
    localStorage.removeItem(AI_KEY);
    sessionStorage.removeItem(AI_KEY);
  } catch {}
}

export function isDark(mode: Mode = prefs.mode) {
  if (mode === "auto") return matchMedia("(prefers-color-scheme: dark)").matches;
  return mode === "dark";
}

export function applyTheme() {
  const el = document.documentElement;
  el.dataset.theme = prefs.theme;
  el.classList.toggle("dark", isDark());
  el.dataset.font = prefs.font;
}

/** Keep `auto` mode in sync with the OS. */
if (typeof window !== "undefined") {
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (prefs.mode === "auto") applyTheme();
  });
}

/* ---- Cross-island events ---- */
export const EVENTS = {
  /** detail: { text: string } — ask the AI about a selected passage. Opens the chat. */
  askAi: "docs:ask-ai",
  /** no detail — open the settings dialog. */
  openSettings: "docs:open-settings",
  /** no detail — open the chat panel. */
  openChat: "docs:open-chat",
} as const;

export function emit(name: (typeof EVENTS)[keyof typeof EVENTS], detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

/** Page context injected by DocsLayout as <script type="application/json" id="doc-context">. */
export interface DocContext {
  title: string;
  href: string;
  description?: string;
  body: string; // raw markdown
}
export function getDocContext(): DocContext | null {
  try {
    const el = document.getElementById("doc-context");
    return el ? (JSON.parse(el.textContent ?? "null") as DocContext) : null;
  } catch {
    return null;
  }
}
