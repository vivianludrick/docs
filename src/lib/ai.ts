/**
 * Browser-side LLM access for the docs assistant.
 *
 * The site is static (GitHub Pages), so every call goes straight from the
 * reader's browser to the provider with the reader's own API key. This module
 * is dynamically imported by the chat island on first send so that the AI SDK
 * and provider packages never land in the initial bundle.
 */
import { APICallError, streamText, type LanguageModel, type ModelMessage } from "ai";
import type { AiSettings, DocContext } from "./settings.svelte";

export type ChatRole = "user" | "assistant";
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Roughly 15k tokens; enough for any article here without blowing a context window. */
const MAX_DOC_CHARS = 60_000;

export async function createModel(settings: AiSettings): Promise<LanguageModel> {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) throw new Error("Add an API key in Settings");
  const model = settings.model.trim();
  if (!model) throw new Error("Choose a model in Settings");

  switch (settings.provider) {
    case "google": {
      const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
      return createGoogleGenerativeAI({ apiKey })(model);
    }
    case "openai": {
      const { createOpenAI } = await import("@ai-sdk/openai");
      return createOpenAI({ apiKey })(model);
    }
    case "anthropic": {
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      return createAnthropic({
        apiKey,
        headers: { "anthropic-dangerous-direct-browser-access": "true" },
      })(model);
    }
    case "openrouter": {
      const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
      return createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        headers: {
          "HTTP-Referer": typeof location !== "undefined" ? location.origin : "",
          "X-Title": "Docs assistant",
        },
      })(model);
    }
    default: {
      const never: never = settings.provider;
      throw new Error(`Unknown provider: ${String(never)}`);
    }
  }
}

export function buildSystemPrompt(ctx: DocContext | null): string {
  const base = [
    "You are a concise, friendly tutor embedded in a personal documentation site.",
    "Answer in GitHub-flavoured Markdown. Prefer short paragraphs, bullet lists and small code blocks.",
    "Be direct: no preamble, no restating the question, no closing pleasantries.",
    "If you are unsure or the answer is not in the material, say so rather than guessing.",
  ];

  if (!ctx) {
    return [
      ...base,
      "The reader is not on an article page, so there is no document context. Help with whatever they ask.",
    ].join("\n");
  }

  let body = ctx.body ?? "";
  let note = "";
  if (body.length > MAX_DOC_CHARS) {
    body = body.slice(0, MAX_DOC_CHARS);
    note = `\n\n[Note: the document was truncated to its first ${MAX_DOC_CHARS.toLocaleString()} characters.]`;
  }

  return [
    ...base,
    "",
    `The reader is currently viewing the document "${ctx.title}"${ctx.description ? ` (${ctx.description})` : ""} at ${ctx.href}.`,
    "Treat it as the primary source: ground your answers in it, quote or reference its sections when useful,",
    "and when asked to summarise, explain, quiz or suggest next reading, base that on this document.",
    "The full document in Markdown follows between the <document> tags.",
    "",
    "<document>",
    body + note,
    "</document>",
  ].join("\n");
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  settings: AiSettings;
  ctx: DocContext | null;
  signal?: AbortSignal;
}

/**
 * Stream a reply as text deltas. Throws an Error with a readable message on
 * failure (including provider errors surfaced mid-stream). Aborting via the
 * signal ends the iteration quietly.
 */
export async function* streamChat({
  messages,
  settings,
  ctx,
  signal,
}: StreamChatOptions): AsyncGenerator<string> {
  const model = await createModel(settings);
  const modelMessages: ModelMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));

  try {
    const result = streamText({
      model,
      instructions: buildSystemPrompt(ctx),
      messages: modelMessages,
      abortSignal: signal,
      maxRetries: 1,
    });

    // `textStream` swallows error parts; `fullStream` lets us surface them.
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        yield part.text;
      } else if (part.type === "error") {
        throw part.error;
      } else if (part.type === "abort") {
        return;
      }
    }
  } catch (err) {
    if (signal?.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
    throw new Error(toReadableMessage(err, settings), { cause: err });
  }
}

function toReadableMessage(err: unknown, settings: AiSettings): string {
  if (APICallError.isInstance(err)) {
    const status = err.statusCode;
    if (status === 401 || status === 403) return "Invalid API key";
    if (status === 404) {
      const detail = extractDetail(err.responseBody);
      return detail
        ? `Model "${settings.model}": ${detail}`
        : `Model "${settings.model}" was not found for ${settings.provider}. Use "Fetch models" in Settings to see what your key can access.`;
    }
    if (status === 429) return "Rate limited by the provider. Try again shortly.";
    if (status && status >= 500)
      return "The provider is having trouble right now. Try again shortly.";
    const detail = extractDetail(err.responseBody);
    return detail ? `${status ? `${status}: ` : ""}${detail}` : err.message;
  }
  if (err instanceof TypeError && /fetch|network|load failed/i.test(err.message)) {
    return "Network error. The provider may block direct browser requests (CORS) or you may be offline.";
  }
  if (err instanceof Error) {
    if (/api key|unauthori[sz]ed|401/i.test(err.message)) return "Invalid API key";
    return err.message;
  }
  return "Something went wrong talking to the model";
}

function extractDetail(body?: string): string | null {
  if (!body) return null;
  try {
    const json = JSON.parse(body) as { error?: { message?: string } | string; message?: string };
    const msg = typeof json.error === "string" ? json.error : (json.error?.message ?? json.message);
    return msg ? String(msg).slice(0, 300) : null;
  } catch {
    return body.slice(0, 300);
  }
}
