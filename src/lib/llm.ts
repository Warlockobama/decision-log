// Provider-agnostic LLM layer for generating fresh suggestions. Dormant until
// configured via env. Two adapters only:
//   - "anthropic"           native Messages API (default model claude-opus-4-8)
//   - "openai-compatible"   OpenAI /chat/completions (covers OpenAI, Groq, local)
//
// Prompt-building and parsing are pure (and unit-tested) — the realistic
// failure mode is messy model output, not the HTTP call. The adapter is kept
// thin because, with no key configured, it can't be exercised in tests.

import type { Suggestion } from "./suggestions";

export type Provider = "anthropic" | "openai-compatible";

export interface LlmConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

interface Resolved {
  config: LlmConfig | null;
  reason: string | null; // why it's disabled, for the UI
}

const DEFAULT_BASE_URL: Record<string, string> = {
  anthropic: "https://api.anthropic.com",
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
};

/** Resolve config from env. Returns a reason string when not fully configured. */
export function resolveLlm(env: NodeJS.ProcessEnv = process.env): Resolved {
  const provider = (env.LLM_PROVIDER ?? "").toLowerCase().trim();
  if (!provider) {
    return {
      config: null,
      reason: "Set LLM_PROVIDER (anthropic | openai | groq) and an API key to enable AI suggestions.",
    };
  }

  if (provider === "anthropic") {
    const apiKey = env.ANTHROPIC_API_KEY || env.LLM_API_KEY || "";
    if (!apiKey) return { config: null, reason: "Set ANTHROPIC_API_KEY to enable AI suggestions." };
    return {
      config: {
        provider: "anthropic",
        apiKey,
        model: env.LLM_MODEL || "claude-opus-4-8",
        baseUrl: env.LLM_BASE_URL || DEFAULT_BASE_URL.anthropic,
      },
      reason: null,
    };
  }

  if (provider === "openai" || provider === "groq" || provider === "openai-compatible") {
    const apiKey =
      env.LLM_API_KEY ||
      (provider === "openai" ? env.OPENAI_API_KEY : "") ||
      (provider === "groq" ? env.GROQ_API_KEY : "") ||
      "";
    const baseUrl = env.LLM_BASE_URL || DEFAULT_BASE_URL[provider] || "";
    const model = env.LLM_MODEL || "";
    if (!apiKey) return { config: null, reason: `Set an API key (LLM_API_KEY) for ${provider}.` };
    if (!baseUrl) return { config: null, reason: "Set LLM_BASE_URL for openai-compatible." };
    if (!model) return { config: null, reason: "Set LLM_MODEL (e.g. gpt-4o-mini or llama-3.3-70b-versatile)." };
    return { config: { provider: "openai-compatible", apiKey, model, baseUrl }, reason: null };
  }

  return { config: null, reason: `Unknown LLM_PROVIDER "${provider}".` };
}

export function llmStatus(env: NodeJS.ProcessEnv = process.env): {
  enabled: boolean;
  provider: string | null;
  reason: string | null;
} {
  const { config, reason } = resolveLlm(env);
  return {
    enabled: config !== null,
    provider: config?.provider ?? null,
    reason,
  };
}

// ---------- pure prompt + parsing ----------

export function buildSuggestionPrompt(
  topics: string[],
  count: number,
  today: Date,
): { system: string; user: string } {
  const topicLine = topics.length
    ? topics.join(", ")
    : "general current events, markets, tech, and personal goals";
  const system =
    "You generate calibration-training forecasting questions. Each must be a " +
    "specific claim that resolves to a clear YES or NO by a date. Output ONLY a " +
    "JSON array — no prose, no markdown fences. Each element: " +
    '{"claim": string, "category": string, "resolves_at": "YYYY-MM-DD", "base_rate_pct": number 0..1}. ' +
    "Keep claims concise and genuinely uncertain (avoid near-certainties).";
  const user =
    `Today is ${today.toISOString().slice(0, 10)}. ` +
    `Propose ${count} timely forecasting questions in these interest areas: ${topicLine}. ` +
    `Pick resolution dates within the next few months.`;
  return { system, user };
}

interface RawSuggestion {
  claim: string;
  category?: string;
  resolves_at?: string;
  base_rate_pct?: number;
}

/** Lenient parse: tolerate ```json fences, prose preamble, and trailing commas. */
export function parseSuggestions(text: string): RawSuggestion[] {
  if (!text) return [];
  let body = text.trim();
  // strip code fences
  body = body.replace(/```(?:json)?/gi, "");
  // slice to the outermost array
  const start = body.indexOf("[");
  const end = body.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return [];
  let slice = body.slice(start, end + 1);
  // remove trailing commas before } or ]
  slice = slice.replace(/,(\s*[}\]])/g, "$1");

  let parsed: unknown;
  try {
    parsed = JSON.parse(slice);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const out: RawSuggestion[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.claim !== "string" || !o.claim.trim()) continue;
    let pct: number | undefined;
    if (typeof o.base_rate_pct === "number") {
      pct = Math.min(1, Math.max(0, o.base_rate_pct));
    }
    out.push({
      claim: o.claim.trim(),
      category: typeof o.category === "string" ? o.category : undefined,
      resolves_at:
        typeof o.resolves_at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.resolves_at)
          ? o.resolves_at
          : undefined,
      base_rate_pct: pct,
    });
  }
  return out;
}

function toSuggestions(raws: RawSuggestion[]): Suggestion[] {
  return raws.map((r, i) => ({
    id: `ai-${i}`,
    claim: r.claim,
    category: r.category ?? "",
    topics: [],
    resolvesAt: r.resolves_at ?? "",
    baseRatePct: r.base_rate_pct ?? null,
  }));
}

// ---------- thin network adapter ----------

async function callLlm(
  config: LlmConfig,
  system: string,
  user: string,
): Promise<string> {
  if (config.provider === "anthropic") {
    const res = await fetch(`${config.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
    const data = await res.json();
    return (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");
  }

  // openai-compatible
  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`LLM API error ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

/** Generate suggestions via the configured provider. Throws if not configured. */
export async function generateSuggestions(
  topics: string[],
  count = 6,
  today = new Date(),
): Promise<Suggestion[]> {
  const { config } = resolveLlm();
  if (!config) throw new Error("LLM not configured");
  const { system, user } = buildSuggestionPrompt(topics, count, today);
  const text = await callLlm(config, system, user);
  return toSuggestions(parseSuggestions(text));
}
