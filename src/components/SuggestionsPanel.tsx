"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Suggestion {
  id: string;
  claim: string;
  category: string;
  resolvesAt: string;
  baseRatePct: number | null;
}
interface LlmStatus {
  enabled: boolean;
  provider: string | null;
  reason: string | null;
}
interface FeedData {
  topics: string[];
  seeded: boolean;
  suggestions: Suggestion[];
  llm: LlmStatus;
}

function hrefFor(s: Suggestion): string {
  const p = new URLSearchParams();
  p.set("claim", s.claim);
  if (s.category) p.set("category", s.category);
  if (s.resolvesAt) p.set("resolves_at", s.resolvesAt);
  if (s.baseRatePct != null) p.set("base_rate_pct", String(s.baseRatePct));
  return `/new?${p.toString()}`;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function SuggestionsPanel() {
  const [data, setData] = useState<FeedData | null>(null);
  const [serverTopics, setServerTopics] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<Suggestion[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/suggestions");
    const d: FeedData = await res.json();
    setData(d);
    setServerTopics(d.topics);
    setTopics(d.topics);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = JSON.stringify(topics) !== JSON.stringify(serverTopics);

  function addTopic() {
    const t = newTopic.trim().toLowerCase();
    if (t && !topics.includes(t)) setTopics([...topics, t]);
    setNewTopic("");
  }

  async function saveTopics() {
    const res = await fetch("/api/topics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics }),
    });
    if (res.ok) {
      setAiSuggestions(null);
      await load();
    }
  }

  async function generate() {
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await fetch("/api/suggestions/generate", { method: "POST" });
      const d = await res.json();
      if (!d.enabled) {
        setAiMessage(d.reason ?? "AI suggestions aren't configured.");
      } else if (d.error) {
        setAiMessage(d.error);
      } else if (Array.isArray(d.suggestions) && d.suggestions.length) {
        setAiSuggestions(d.suggestions);
      } else {
        setAiMessage("No suggestions returned — try again.");
      }
    } catch {
      setAiMessage("Couldn't reach the model — try again.");
    } finally {
      setAiLoading(false);
    }
  }

  if (!data) {
    return (
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="h-5 w-40 animate-pulse rounded bg-surface-muted" />
      </section>
    );
  }

  const shown = aiSuggestions ?? data.suggestions;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
          Suggested questions
        </h2>
        <button
          onClick={generate}
          disabled={aiLoading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-ink disabled:opacity-50"
          title={data.llm.enabled ? "Generate fresh ideas with AI" : "Configure an API key to enable"}
        >
          {aiLoading ? "Generating…" : "✨ Generate more (AI)"}
        </button>
      </div>

      {/* Interest topics */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-faint">
          {data.seeded ? "Interests (from your history):" : "Interests:"}
        </span>
        {topics.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted"
          >
            {t}
            <button
              onClick={() => setTopics(topics.filter((x) => x !== t))}
              className="text-faint hover:text-no"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTopic();
            }
          }}
          placeholder="add topic…"
          className="w-28 rounded-full border border-dashed border-border bg-transparent px-2 py-0.5 text-xs outline-none focus:border-accent"
        />
        {dirty && (
          <>
            <button
              onClick={saveTopics}
              className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-white hover:bg-accent-hover"
            >
              Save
            </button>
            <button
              onClick={() => setTopics(serverTopics)}
              className="text-xs text-faint hover:text-ink"
            >
              cancel
            </button>
          </>
        )}
      </div>

      {aiMessage && (
        <p className="mb-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
          {aiMessage}
        </p>
      )}

      {aiSuggestions && (
        <p className="mb-2 flex items-center gap-2 text-xs text-faint">
          <span className="rounded bg-accent-soft px-1.5 py-0.5 font-medium text-accent">
            AI-generated
          </span>
          <button onClick={() => setAiSuggestions(null)} className="hover:text-ink">
            show curated
          </button>
        </p>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {shown.map((s) => (
          <li
            key={s.id}
            className="flex flex-col justify-between rounded-lg border border-border bg-canvas p-3"
          >
            <p className="text-sm font-medium leading-snug text-ink">{s.claim}</p>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-faint">
                {s.category && (
                  <span className="rounded bg-surface-muted px-1.5 py-0.5 text-muted">
                    {s.category}
                  </span>
                )}
                {s.resolvesAt && <span>resolves {fmtDate(s.resolvesAt)}</span>}
                {s.baseRatePct != null && (
                  <span>base rate ~{Math.round(s.baseRatePct * 100)}%</span>
                )}
              </div>
              <Link
                href={hrefFor(s)}
                className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white transition hover:bg-accent-hover"
              >
                Use this →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
