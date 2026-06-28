"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20";
const labelClass = "block text-sm font-medium text-ink mb-1";
const hintClass = "mt-1 text-xs text-faint";

const CATEGORIES = ["markets", "macro", "tech", "work", "personal", "politics", "sports"];

type Step = 0 | 1 | 2;
const STEPS = ["Claim", "Outside view", "Your forecast"];

export interface WizardPrefill {
  claim?: string;
  category?: string;
  resolvesAt?: string;
  /** Outside-view hint, 0..1. Probability is intentionally NOT prefilled. */
  baseRatePct?: number | null;
}

export default function PredictionWizard({ prefill }: { prefill?: WizardPrefill }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);

  // Step 1 — the claim
  const [claim, setClaim] = useState(prefill?.claim ?? "");
  const [category, setCategory] = useState(prefill?.category ?? "");
  const [resolvesAt, setResolvesAt] = useState(prefill?.resolvesAt ?? "");

  // Step 2 — outside view (captured BEFORE the probability)
  const [baseRatePct, setBaseRatePct] = useState<number | null>(
    prefill?.baseRatePct != null ? Math.round(prefill.baseRatePct * 100) : null,
  );
  const [baseRateText, setBaseRateText] = useState("");

  // Step 3 — the forecast
  const [probability, setProbability] = useState(50);
  const [reasoning, setReasoning] = useState("");
  const [wwcm, setWwcm] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const claimValid = claim.trim().length > 0;
  const delta = baseRatePct === null ? null : probability - baseRatePct;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim: claim.trim(),
          probability: probability / 100,
          category: category || null,
          base_rate: baseRateText.trim() || null,
          base_rate_pct: baseRatePct === null ? null : baseRatePct / 100,
          reasoning: reasoning.trim() || null,
          what_would_change_my_mind: wwcm.trim() || null,
          resolves_at: resolvesAt || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save");
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-card sm:p-8">
      <Progress step={step} />

      {step === 0 && (
        <Section
          title="What are you predicting?"
          blurb="A specific claim that will resolve to a clear yes or no by a date."
        >
          <div>
            <label className={labelClass} htmlFor="claim">
              The claim
            </label>
            <textarea
              id="claim"
              value={claim}
              onChange={(e) => setClaim(e.target.value)}
              rows={2}
              autoFocus
              placeholder="e.g. AAPL closes above $220 by Sep 30, 2026"
              className={inputClass}
            />
            <p className={hintClass}>
              Make it falsifiable — someone else should be able to score it.
            </p>
          </div>

          <div>
            <label className={labelClass}>Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(category === c ? "" : c)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    category === c
                      ? "border-accent bg-accent-soft font-medium text-accent"
                      : "border-border text-muted hover:border-accent/40 hover:text-ink"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="resolves">
              Resolves on
            </label>
            <input
              id="resolves"
              type="date"
              value={resolvesAt}
              onChange={(e) => setResolvesAt(e.target.value)}
              className={`${inputClass} max-w-xs`}
            />
            <p className={hintClass}>When will you know the answer?</p>
          </div>
        </Section>
      )}

      {step === 1 && (
        <Section
          title="The outside view first"
          blurb="Before your own estimate: how often do things in this reference class happen? Anchoring on the base rate fights optimism and inside-view bias."
        >
          <div>
            <label className={labelClass}>Base rate</label>
            {baseRatePct === null ? (
              <button
                type="button"
                onClick={() => setBaseRatePct(50)}
                className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted transition hover:border-accent/50 hover:text-ink"
              >
                + Estimate a base rate %
              </button>
            ) : (
              <div className="rounded-xl border border-border bg-canvas p-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-mono text-2xl font-semibold text-ink">
                    {baseRatePct}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setBaseRatePct(null)}
                    className="text-xs text-faint hover:text-no"
                  >
                    clear
                  </button>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={baseRatePct}
                  onChange={(e) => setBaseRatePct(Number(e.target.value))}
                  className="w-full"
                />
              </div>
            )}
            <p className={hintClass}>
              Roughly how often does this kind of event happen, in general?
            </p>
          </div>

          <div>
            <label className={labelClass} htmlFor="brtext">
              Reference class & sources
            </label>
            <textarea
              id="brtext"
              value={baseRateText}
              onChange={(e) => setBaseRateText(e.target.value)}
              rows={3}
              placeholder="What comparable cases are you drawing on? e.g. 'AAPL has been up in ~55% of quarters; it's near $210 now.'"
              className={inputClass}
            />
          </div>
        </Section>
      )}

      {step === 2 && (
        <Section
          title="Now — your probability"
          blurb="Your forecast that the event happens as stated. Below 50% is a prediction it won't."
        >
          <div className="rounded-xl border border-border bg-canvas p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="font-mono text-4xl font-semibold text-accent">
                {probability}%
              </span>
              {delta !== null && (
                <span className="text-right text-sm">
                  <span className="text-faint">vs base rate </span>
                  <span className="font-mono text-muted">{baseRatePct}%</span>
                  {Math.abs(delta) >= 1 && (
                    <span
                      className={`ml-1 font-medium ${delta > 0 ? "text-over" : "text-under"}`}
                    >
                      ({delta > 0 ? "+" : "−"}
                      {Math.abs(delta)} pts)
                    </span>
                  )}
                </span>
              )}
            </div>
            <input
              type="range"
              min={1}
              max={99}
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-faint">
              <span>won&apos;t happen</span>
              <span>coin flip</span>
              <span>will happen</span>
            </div>
            {delta !== null && Math.abs(delta) >= 10 && (
              <p className="mt-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
                You&apos;re {Math.abs(delta)} points {delta > 0 ? "above" : "below"} the
                base rate — what makes this case different? Note it below.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass} htmlFor="reasoning">
              Reasoning (inside view)
            </label>
            <textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={3}
              placeholder="Why this number, given the base rate? Captured now, so later review is immune to hindsight."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass} htmlFor="wwcm">
              What would change my mind?
            </label>
            <textarea
              id="wwcm"
              value={wwcm}
              onChange={(e) => setWwcm(e.target.value)}
              rows={2}
              placeholder="What evidence would flip this forecast?"
              className={inputClass}
            />
          </div>
        </Section>
      )}

      {error && <p className="mt-4 text-sm text-no">{error}</p>}

      {/* Nav */}
      <div className="mt-7 flex items-center justify-between border-t border-border pt-5">
        <button
          type="button"
          onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
          disabled={step === 0 || busy}
          className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-ink disabled:invisible"
        >
          ← Back
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={step === 0 && !claimValid}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue →
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={busy || !claimValid}
            className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-50"
          >
            {busy ? "Saving…" : "Log prediction"}
          </button>
        )}
      </div>
    </div>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <ol className="mb-7 flex items-center gap-2">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                state === "current"
                  ? "bg-accent text-white"
                  : state === "done"
                    ? "bg-accent-soft text-accent"
                    : "bg-surface-muted text-faint"
              }`}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={`text-xs font-medium ${
                state === "todo" ? "text-faint" : "text-ink"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="ml-1 hidden h-px flex-1 bg-border sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Section({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-muted">{blurb}</p>
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}
