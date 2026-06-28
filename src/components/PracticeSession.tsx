"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import CalibrationChart from "./CalibrationChart";
import { biasLabel, num, pct } from "@/lib/format";
import type { CalibrationBin } from "@/lib/calibration";

interface Question {
  id: string;
  statement: string;
  answer: boolean;
  topic: string;
  note: string | null;
}
interface ScoredItem {
  id: string;
  statement: string;
  probability: number;
  outcome: 0 | 1;
  note?: string;
}
interface Result {
  count: number;
  summary: { brier: number | null; ece: number | null; bias: number | null };
  curve: CalibrationBin[];
  items: ScoredItem[];
}
interface SessionRow {
  id: number;
  created_at: string;
  count: number;
  brier: number | null;
}

const N = 10;

export default function PracticeSession() {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [probs, setProbs] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<SessionRow[]>([]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/practice/history");
    const d = await res.json();
    setHistory(d.sessions ?? []);
  }, []);

  const startRound = useCallback(async () => {
    setQuestions(null);
    setResult(null);
    setIdx(0);
    setProbs({});
    setRevealed(false);
    const res = await fetch(`/api/practice?n=${N}`);
    const d = await res.json();
    setQuestions(d.questions);
  }, []);

  useEffect(() => {
    startRound();
    loadHistory();
  }, [startRound, loadHistory]);

  async function finish(allProbs: Record<string, number>) {
    if (!questions) return;
    setSubmitting(true);
    const answers = questions.map((q) => ({
      id: q.id,
      probability: (allProbs[q.id] ?? 50) / 100,
    }));
    const res = await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const d: Result = await res.json();
    setResult(d);
    setSubmitting(false);
    loadHistory();
  }

  if (!questions) {
    return <div className="h-40 animate-pulse rounded-xl bg-surface-muted" />;
  }

  // ---------- results ----------
  if (result) {
    const bias = biasLabel(result.summary.bias);
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Round complete</h2>
          <p className="mb-4 text-sm text-muted">
            {result.count} questions · how well did your confidence match reality?
          </p>
          <div className="grid grid-cols-3 gap-3">
            <ResultStat label="Brier" value={num(result.summary.brier)} hint="lower is better" />
            <ResultStat label="Calibration error" value={pct(result.summary.ece, 1)} />
            <ResultStat label="Tendency" value={bias.text} tone={bias.tone} />
          </div>
          <div className="mt-4">
            <CalibrationChart curve={result.curve} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
            Review
          </h3>
          <ul className="space-y-2">
            {result.items.map((it) => {
              const correctDir =
                (it.outcome === 1 && it.probability >= 0.5) ||
                (it.outcome === 0 && it.probability < 0.5);
              return (
                <li key={it.id} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
                  <div>
                    <p className="text-sm text-ink">{it.statement}</p>
                    {it.note && <p className="text-xs text-faint">{it.note}</p>}
                  </div>
                  <div className="shrink-0 text-right text-xs">
                    <span
                      className="font-semibold"
                      style={{ color: it.outcome ? "var(--color-yes)" : "var(--color-no)" }}
                    >
                      {it.outcome ? "TRUE" : "FALSE"}
                    </span>
                    <div className="text-faint">
                      you said <span className="font-mono">{pct(it.probability)}</span>{" "}
                      {correctDir ? "✓" : "✗"}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={startRound}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover"
          >
            New round
          </button>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Back to dashboard
          </Link>
        </div>

        <PracticeHistory history={history} />
      </div>
    );
  }

  // ---------- in-round ----------
  const q = questions[idx];
  const p = probs[q.id] ?? 50;
  const isLast = idx === questions.length - 1;

  function setProb(v: number) {
    setProbs((prev) => ({ ...prev, [q.id]: v }));
  }
  function next() {
    if (isLast) {
      finish(probs);
    } else {
      setIdx(idx + 1);
      setRevealed(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
        <div className="mb-4 flex items-center justify-between text-xs text-faint">
          <span>
            Question {idx + 1} of {questions.length}
          </span>
          <span className="rounded bg-surface-muted px-1.5 py-0.5 text-muted">{q.topic}</span>
        </div>

        <p className="mb-6 text-xl font-medium leading-snug text-ink">{q.statement}</p>

        <div className="rounded-xl border border-border bg-canvas p-5">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-sm text-muted">How likely is this true?</span>
            <span className="font-mono text-3xl font-semibold text-accent">{p}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={99}
            value={p}
            disabled={revealed}
            onChange={(e) => setProb(Number(e.target.value))}
            className="w-full disabled:opacity-60"
          />
          <div className="mt-1 flex justify-between text-xs text-faint">
            <span>certainly false</span>
            <span>coin flip</span>
            <span>certainly true</span>
          </div>
        </div>

        {revealed && (
          <div className="mt-4 rounded-xl border border-border bg-surface-muted p-4">
            <p className="text-sm">
              <span
                className="font-semibold"
                style={{ color: q.answer ? "var(--color-yes)" : "var(--color-no)" }}
              >
                {q.answer ? "TRUE" : "FALSE"}
              </span>{" "}
              <span className="text-muted">
                — you said <span className="font-mono">{p}%</span> likely true.
              </span>
            </p>
            {q.note && <p className="mt-1 text-xs text-muted">{q.note}</p>}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover"
            >
              Lock in
            </button>
          ) : (
            <button
              onClick={next}
              disabled={submitting}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-accent-hover disabled:opacity-50"
            >
              {isLast ? (submitting ? "Scoring…" : "See results →") : "Next →"}
            </button>
          )}
        </div>
      </div>

      {!result && history.length > 0 && <PracticeHistory history={history} />}
    </div>
  );
}

function ResultStat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "over" | "under";
}) {
  const toneClass =
    tone === "over" ? "text-over" : tone === "under" ? "text-under" : "text-ink";
  return (
    <div className="rounded-xl border border-border bg-canvas p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-faint">{hint}</div>}
    </div>
  );
}

function PracticeHistory({ history }: { history: SessionRow[] }) {
  if (history.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-card">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">
        Past rounds
      </h3>
      <ul className="space-y-1.5">
        {history.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-sm">
            <span className="text-muted">
              {new Date(s.created_at.replace(" ", "T") + "Z").toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span className="text-faint">
              {s.count} Qs · Brier <span className="font-mono text-ink">{num(s.brier)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
