import { describe, it, expect } from "vitest";
import {
  buildSuggestionPrompt,
  llmStatus,
  parseSuggestions,
  resolveLlm,
} from "./llm";

describe("parseSuggestions (messy LLM output)", () => {
  it("parses a clean array", () => {
    const out = parseSuggestions('[{"claim":"X happens","category":"macro"}]');
    expect(out).toHaveLength(1);
    expect(out[0].claim).toBe("X happens");
  });

  it("strips ```json fences", () => {
    const out = parseSuggestions('```json\n[{"claim":"Y"}]\n```');
    expect(out[0].claim).toBe("Y");
  });

  it("ignores prose preamble before the array", () => {
    const out = parseSuggestions(
      'Sure! Here are some ideas:\n[{"claim":"Z","base_rate_pct":0.4}]\nHope that helps.',
    );
    expect(out[0].claim).toBe("Z");
    expect(out[0].base_rate_pct).toBe(0.4);
  });

  it("tolerates trailing commas", () => {
    const out = parseSuggestions('[{"claim":"A",},{"claim":"B",},]');
    expect(out.map((s) => s.claim)).toEqual(["A", "B"]);
  });

  it("drops items without a claim and clamps base rate", () => {
    const out = parseSuggestions(
      '[{"category":"x"},{"claim":"ok","base_rate_pct":1.7}]',
    );
    expect(out).toHaveLength(1);
    expect(out[0].base_rate_pct).toBe(1);
  });

  it("returns [] on unparseable input rather than throwing", () => {
    expect(parseSuggestions("not json at all")).toEqual([]);
    expect(parseSuggestions("")).toEqual([]);
  });

  it("keeps only well-formed resolve dates", () => {
    const out = parseSuggestions(
      '[{"claim":"a","resolves_at":"soon"},{"claim":"b","resolves_at":"2026-09-30"}]',
    );
    expect(out[0].resolves_at).toBeUndefined();
    expect(out[1].resolves_at).toBe("2026-09-30");
  });
});

describe("resolveLlm / llmStatus", () => {
  it("is dormant with no env", () => {
    const s = llmStatus({} as NodeJS.ProcessEnv);
    expect(s.enabled).toBe(false);
    expect(s.reason).toMatch(/LLM_PROVIDER/);
  });

  it("enables anthropic with a key and defaults the model", () => {
    const { config } = resolveLlm({
      LLM_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "sk-x",
    } as NodeJS.ProcessEnv);
    expect(config?.provider).toBe("anthropic");
    expect(config?.model).toBe("claude-opus-4-8");
  });

  it("requires a model for the openai-compatible path", () => {
    const noModel = resolveLlm({
      LLM_PROVIDER: "groq",
      GROQ_API_KEY: "gsk",
    } as NodeJS.ProcessEnv);
    expect(noModel.config).toBeNull();
    expect(noModel.reason).toMatch(/LLM_MODEL/);

    const ok = resolveLlm({
      LLM_PROVIDER: "groq",
      GROQ_API_KEY: "gsk",
      LLM_MODEL: "llama-3.3-70b-versatile",
    } as NodeJS.ProcessEnv);
    expect(ok.config?.provider).toBe("openai-compatible");
    expect(ok.config?.baseUrl).toContain("groq.com");
  });
});

describe("buildSuggestionPrompt", () => {
  it("includes the topics and asks for JSON only", () => {
    const { system, user } = buildSuggestionPrompt(["oil", "ai"], 5, new Date(2026, 5, 1));
    expect(user).toContain("oil, ai");
    expect(user).toContain("5");
    expect(system).toMatch(/JSON array/i);
  });
});
