import type { AiSettings, Provider } from "./settings.svelte";

/**
 * Ask the provider which models this key can use. Runs in the browser.
 * Returns model ids suitable for `ai.model`, most relevant first.
 */
export async function listModels(
  settings: Pick<AiSettings, "provider" | "apiKey">,
): Promise<string[]> {
  const { provider, apiKey } = settings;
  if (!apiKey && provider !== "openrouter") throw new Error("Add an API key first");

  const fetchers: Record<Provider, () => Promise<string[]>> = {
    async google() {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(apiKey)}`,
      );
      const data = await okJson(res);
      return (data.models ?? [])
        .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m: any) => String(m.name).replace(/^models\//, ""))
        .filter(
          (id: string) =>
            !/(tts|image|audio|transcribe|robotics|computer-use|lyria|nano-banana|embedding)/i.test(
              id,
            ),
        )
        .sort(rank);
    },
    async openai() {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await okJson(res);
      return (data.data ?? [])
        .map((m: any) => String(m.id))
        .filter(
          (id: string) =>
            /^(gpt-|o\d|chatgpt-)/.test(id) &&
            !/(audio|realtime|tts|transcribe|image|embedding|moderation|search|instruct)/.test(id),
        )
        .sort(rank);
    },
    async anthropic() {
      const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });
      const data = await okJson(res);
      return (data.data ?? []).map((m: any) => String(m.id)).sort(rank);
    },
    async openrouter() {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });
      const data = await okJson(res);
      return (data.data ?? [])
        .map((m: any) => String(m.id))
        .filter((id: string) =>
          /^(google|openai|anthropic|meta-llama|mistralai|deepseek|qwen|x-ai)\//.test(id),
        )
        .sort(rank);
    },
  };

  return fetchers[provider]();
}

async function okJson(res: Response) {
  let body: any = null;
  try {
    body = await res.json();
  } catch {}
  if (!res.ok) {
    const msg = body?.error?.message ?? body?.error ?? res.statusText;
    if (res.status === 401 || res.status === 403) throw new Error("Invalid API key");
    throw new Error(typeof msg === "string" ? msg : `Request failed (${res.status})`);
  }
  return body ?? {};
}

/** Newer-looking ids first (higher version numbers), previews after stable, "latest" aliases on top. */
function rank(a: string, b: string) {
  const score = (id: string) => {
    let s = 0;
    if (/latest/.test(id)) s += 1000;
    if (/preview|exp|beta/.test(id)) s -= 50;
    const nums = id.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    s += (nums[0] ?? 0) * 10;
    return s;
  };
  return score(b) - score(a) || a.localeCompare(b);
}
