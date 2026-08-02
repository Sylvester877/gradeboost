/**
 * AI client — OpenRouter (Nemotron 3 Ultra + Ling 3.0 Flash) via OpenRouter.
 *
 * Env vars (set in .env):
 *   OPENROUTER_API_KEY            - enables OpenRouter
 *   OPENROUTER_MODEL              - text model slug (default: nvidia/nemotron-3-ultra-550b-a55b:free)
 *   OPENROUTER_VISION_MODEL       - vision model slug (default: nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free)
 *   OPENROUTER_BASE_URL           - optional custom endpoint (default: https://openrouter.ai/api/v1)
 *   OPENROUTER_CHAT_MAX_TOKENS    - chat response length cap (default: 512)
 *   OPENROUTER_VISION_MAX_TOKENS  - vision response length cap (default: 1024)
 */

export const DEFAULT_TEXT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
// Free vision-capable models verified to accept image input and answer math.
// Nemotron nano omni is fast (~4s) and solves maths well; gemma-4-26b is a
// slower fallback if the primary is rate-limited.
export const DEFAULT_VISION_MODEL = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";
export const FALLBACK_VISION_MODEL = "google/gemma-4-26b-a4b-it:free";
export const DEFAULT_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

export interface ModelRef {
  id: string;
  provider: "openrouter";
}

/** True when we have a live OpenRouter API key. */
export function hasApiKey() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

function openRouterModel(envVar: string | undefined, fallback: string): ModelRef {
  return { id: envVar || fallback, provider: "openrouter" };
}

const textModel = process.env.OPENROUTER_API_KEY
  ? openRouterModel(process.env.OPENROUTER_MODEL, DEFAULT_TEXT_MODEL)
  : null;

const visionModel = process.env.OPENROUTER_API_KEY
  ? openRouterModel(process.env.OPENROUTER_VISION_MODEL, DEFAULT_VISION_MODEL)
  : null;

/** Model lists — Nemotron 3 Ultra for text; vision list with fallbacks. */
export const TEXT_MODELS: ModelRef[] = textModel ? [textModel] : [];
export const VISION_MODELS: ModelRef[] = visionModel
  ? [visionModel, { id: FALLBACK_VISION_MODEL, provider: "openrouter" }]
  : [];

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

function baseUrl() {
  return process.env.OPENROUTER_BASE_URL?.replace(/\/$/, "") || "https://openrouter.ai/api/v1";
}

const CHAT_MAX_TOKENS = Number(process.env.OPENROUTER_CHAT_MAX_TOKENS) || 768;
const VISION_MAX_TOKENS = Number(process.env.OPENROUTER_VISION_MAX_TOKENS) || 1024;

function headers(): Record<string, string> {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "https://gradeboost.app",
    "X-Title": "GradeBoost Study",
  };
}

function messageText(m: ChatMessage): string {
  if (typeof m.content === "string") return m.content;
  return m.content
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ");
}

/* ---------- network helpers ---------- */

const DEFAULT_TIMEOUT_MS = 120_000;

const DATA_POLICY_MSG =
  "⚠️ This free model is unavailable until you opt in to data sharing at openrouter.ai/settings/privacy. After opting in, try again.";

function isDataPolicyError(err: string) {
  const e = err.toLowerCase();
  return (
    e.includes("guardrail") ||
    e.includes("data policy") ||
    e.includes("no endpoints available")
  );
}

export class DataPolicyError extends Error {
  constructor() {
    super(DATA_POLICY_MSG);
    this.name = "DataPolicyError";
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

/* ---------- streaming engine ---------- */

async function* streamFromModels(
  messages: ChatMessage[],
  models: ModelRef[],
  opts: { temperature?: number; maxTokens?: number },
  fallback: string
): AsyncGenerator<string, void, unknown> {
  for (const { id: model } of models) {
    const controller = new AbortController();
    const totalTimer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl()}/chat/completions`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          model,
          messages,
          temperature: opts.temperature ?? 0.6,
          max_tokens: opts.maxTokens ?? 1024,
          stream: true,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        console.error(`[openrouter] ${model} HTTP ${res.status}: ${err.slice(0, 300)}`);
        if (isDataPolicyError(err)) {
          yield DATA_POLICY_MSG;
          return;
        }
        continue;
      }
      if (!res.body) continue;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let produced = false;

      while (true) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await reader.read();
        } catch {
          // fetch was aborted (first-token timeout) or reader closed -> try next model
          break;
        }
        const { done, value } = readResult;
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") return;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            // IMPORTANT: never stream `reasoning` / `reasoning_content` deltas.
            // Those are the model's private chain-of-thought ("The user said
            // hi... I should respond...") and must never reach the student.
            const text = delta?.content || "";
            if (text) {
              produced = true;
              yield text as string;
            }
          } catch {
            /* ignore keep-alive / partial */
          }
        }
      }
      if (produced) return; // streamed successfully
      // empty response -> try next model
    } catch {
      // network/model error -> try next model
      continue;
    } finally {
      clearTimeout(totalTimer);
    }
  }
  yield fallback;
}

/** Stream a text completion. */
export function streamChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
) {
  if (!hasApiKey()) return demoGenerator(demoReply(messages), messages);
  return streamFromModels(
    messages,
    TEXT_MODELS,
    { ...opts, maxTokens: opts.maxTokens ?? CHAT_MAX_TOKENS },
    "I couldn't reach the AI model. Check your OPENROUTER_API_KEY in .env and make sure you opted in to data sharing at openrouter.ai/settings/privacy."
  );
}

/** Stream a vision (multimodal) completion. */
export function streamVision(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
) {
  if (!hasApiKey())
    return demoGenerator(
      "Demo mode — add an OPENROUTER_API_KEY to read photos and scans.",
      messages
    );
  return streamFromModels(
    messages,
    VISION_MODELS,
    { ...opts, maxTokens: opts.maxTokens ?? VISION_MAX_TOKENS },
    "I couldn't read that photo right now. Make sure the image is clear and try again, or check your OPENROUTER_API_KEY in .env."
  );
}

async function* demoGenerator(text: string, _m: ChatMessage[]) {
  yield text;
}

/* ---------- non-streaming ---------- */

async function completeWithModels(
  messages: ChatMessage[],
  models: ModelRef[],
  opts: { temperature?: number; maxTokens?: number }
): Promise<string> {
  for (const { id: model } of models) {
    try {
      const res = await fetchWithTimeout(
        `${baseUrl()}/chat/completions`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.6,
            max_tokens: opts.maxTokens ?? 1024,
          }),
        },
        DEFAULT_TIMEOUT_MS
      );
      if (!res.ok) {
        const err = await res.text().catch(() => "");
        console.error(`[openrouter] ${model} HTTP ${res.status}: ${err.slice(0, 300)}`);
        if (isDataPolicyError(err)) {
          throw new DataPolicyError();
        }
        continue;
      }
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (content) return content as string;
    } catch {
      continue;
    }
  }
  throw new Error("All AI models failed to respond.");
}

export async function complete(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (!hasApiKey()) return demoReply(messages);
  return completeWithModels(messages, TEXT_MODELS, opts);
}

export async function completeVision(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (!hasApiKey()) return "";
  return completeWithModels(messages, VISION_MODELS, opts);
}

export async function completeJSON<T = unknown>(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {}
): Promise<T> {
  const raw = await complete(messages, opts);
  return extractJSON<T>(raw);
}

/* ---------- embeddings ---------- */

/**
 * Generate an embedding vector using OpenRouter's free embedding model.
 * Falls back to null on any error so callers can gracefully degrade.
 */
export async function embedding(text: string): Promise<number[] | null> {
  if (!hasApiKey() || !text.trim()) return null;
  try {
    const res = await fetchWithTimeout(
      `${baseUrl()}/embeddings`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          model: DEFAULT_EMBEDDING_MODEL,
          input: text.trim(),
        }),
      },
      30_000
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error(`[openrouter] embeddings HTTP ${res.status}: ${err.slice(0, 200)}`);
      return null;
    }
    const json = await res.json();
    return (json.data?.[0]?.embedding as number[]) ?? null;
  } catch (err) {
    console.error("[openrouter] embeddings error:", err);
    return null;
  }
}

export function extractJSON<T = unknown>(raw: string): T {
  let text = raw
    .trim()
    .replace(/<(?:thinking|think)>[\s\S]*?<\/(?:thinking|think)>/gi, "")
    .replace(/<(?:thinking|think)[\s\S]*$/, "")
    .trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  try {
    return JSON.parse(text) as T;
  } catch {
    const start = text.search(/[{[]/);
    if (start === -1) throw new Error("No JSON found in model output");
    const open = text[start];
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') inStr = true;
      else if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return JSON.parse(text.slice(start, i + 1)) as T;
      }
    }
  }
  throw new Error("Could not parse JSON from model output");
}

/* ---------- demo fallback (no key) ---------- */

function demoReply(messages: ChatMessage[]): string {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) {
    return "Hi! I'm your **AI maths tutor**. Ask me anything about your Essential Mathematics for the Australian Curriculum textbook.\n\n_(Demo mode: add `OPENROUTER_API_KEY` to `.env` for live answers.)_";
  }
  return [
    "**Demo mode** — add `OPENROUTER_API_KEY` to `.env` for live answers.",
    "",
    "Here's how I'd approach **_" + messageText(last) + "_** for Year 10 Australian Curriculum Maths:",
    "",
    "1. **Identify the concept** — which topic does it belong to?",
    "2. **State the rule/formula** that applies.",
    "3. **Substitute** the known values, showing every step.",
    "4. **Solve and check** — estimate first, then verify.",
    "",
    "> Tip: add your textbook chapter as a **Source**, then I'll tailor every answer to it.",
  ].join("\n");
}

export { messageText };