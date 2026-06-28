import Link from "next/link";
import { listPredictions, listCalibrationSessions } from "@/lib/db";
import {
  calibrationCurve,
  calibrationSummary,
  type ScoredPrediction,
} from "@/lib/calibration";
import { biasLabel, formatDate, num, pct } from "@/lib/format";
import type { Prediction } from "@/lib/types";
import CalibrationChart from "@/components/CalibrationChart";
import ResolveForm from "@/components/ResolveForm";
import DeleteButton from "@/components/DeleteButton";
import SuggestionsPanel from "@/components/SuggestionsPanel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function Dashboard() {
  const open = listPredictions("open");
  const resolved = listPredictions("resolved");

  const scored: ScoredPrediction[] = resolved
    .filter((p) => p.outcome !== null)
    .map((p) => ({ probability: p.probability, outcome: p.outcome as 0 | 1 }));

  const summary = calibrationSummary(scored);
  const curve = calibrationCurve(scored);
  const bias = biasLabel(summary.bias);

  const lastPractice = listCalibrationSessions(1)[0];

  return (
    <div className="space-y-8">
      {/* Headline calibration stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Brier score"
          value={num(summary.brier)}
          hint="0 = perfect · 0.25 = coin-flip"
        />
        <Stat
          label="Calibration error"
          value={pct(summary.ece, 1)}
          hint="Avg gap, forecast vs reality"
        />
        <Stat label="Tendency" value={bias.text} tone={bias.tone} />
        <Stat
          label="Track record"
          value={`${resolved.length}`}
          hint={`resolved · ${open.length} open`}
        />
      </section>

      {/* Practice callout */}
      <Link
        href="/practice"
        className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 shadow-card transition hover:border-accent/40"
      >
        <div>
          <div className="text-sm font-semibold text-ink">
            Calibration practice{" "}
            <span aria-hidden className="text-accent">
              →
            </span>
          </div>
          <div className="text-xs text-muted">
            Real predictions resolve slowly — train the skill in minutes with
            instant-feedback true/false rounds.
          </div>
        </div>
        <div className="shrink-0 text-right">
          {lastPractice ? (
            <>
              <div className="font-mono text-lg font-semibold text-ink">
                {num(lastPractice.brier)}
              </div>
              <div className="text-[11px] text-faint">last round Brier</div>
            </>
          ) : (
            <span className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white">
              Start a round
            </span>
          )}
        </div>
      </Link>

      {/* Calibration curve */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            Calibration curve
          </h2>
          <span className="text-xs text-faint">{scored.length} resolved</span>
        </div>
        <CalibrationChart curve={curve} />
      </section>

      {/* Suggested questions to forecast */}
      <SuggestionsPanel />

      {/* Open predictions */}
      <section>
        <SectionHeading count={open.length}>Open predictions</SectionHeading>
        {open.length === 0 ? (
          <EmptyState>
            Nothing open.{" "}
            <Link href="/new" className="font-medium text-accent hover:underline">
              Log a prediction
            </Link>{" "}
            to get started.
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {open.map((p) => (
              <OpenCard key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>

      {/* Resolved history */}
      <section>
        <SectionHeading count={resolved.length}>Resolved</SectionHeading>
        {resolved.length === 0 ? (
          <EmptyState>No resolved predictions yet.</EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {resolved.map((p) => (
              <ResolvedCard key={p.id} p={p} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SectionHeading({
  count,
  children,
}: {
  count: number;
  children: React.ReactNode;
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
      {children}
      <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
        {count}
      </span>
    </h2>
  );
}

function Stat({
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
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums ${toneClass}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-faint">{hint}</div>}
    </div>
  );
}

function ProbBadge({ p }: { p: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent-soft px-2.5 py-1 font-mono text-sm font-semibold text-accent">
      {pct(p)}
    </span>
  );
}

function Meta({ p }: { p: Prediction }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-faint">
      {p.category && (
        <span className="rounded bg-surface-muted px-1.5 py-0.5 font-medium text-muted">
          {p.category}
        </span>
      )}
      {p.resolves_at && <span>resolves {formatDate(p.resolves_at)}</span>}
      <span>logged {formatDate(p.created_at)}</span>
    </div>
  );
}

/** "You said X% vs a Y% base rate" — the outside-view gap, when captured. */
function BaseRateGap({ p }: { p: Prediction }) {
  if (p.base_rate_pct === null) return null;
  const delta = p.probability - p.base_rate_pct;
  const above = delta >= 0;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-surface-muted px-2 py-0.5 text-xs text-muted">
      base rate <span className="font-mono">{pct(p.base_rate_pct)}</span>
      {Math.abs(delta) >= 0.005 && (
        <span className={above ? "text-over" : "text-under"}>
          ({above ? "+" : "−"}
          {Math.round(Math.abs(delta) * 100)} pts)
        </span>
      )}
    </span>
  );
}

function OpenCard({ p }: { p: Prediction }) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="font-medium leading-snug text-ink">{p.claim}</p>
          <Meta p={p} />
        </div>
        <ProbBadge p={p.probability} />
      </div>

      {(p.base_rate || p.base_rate_pct !== null || p.reasoning || p.what_would_change_my_mind) && (
        <div className="mt-3 space-y-1.5 text-sm">
          {p.base_rate_pct !== null && <BaseRateGap p={p} />}
          {p.base_rate && <Field label="Base rate">{p.base_rate}</Field>}
          {p.reasoning && <Field label="Reasoning">{p.reasoning}</Field>}
          {p.what_would_change_my_mind && (
            <Field label="Would change my mind">
              {p.what_would_change_my_mind}
            </Field>
          )}
        </div>
      )}

      <ResolveForm id={p.id} />
      <div className="mt-2 text-right">
        <DeleteButton id={p.id} />
      </div>
    </li>
  );
}

function ResolvedCard({ p }: { p: Prediction }) {
  const happened = p.outcome === 1;
  const surprise = (p.probability - (p.outcome ?? 0)) ** 2; // Brier contribution
  return (
    <li className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="font-medium leading-snug text-ink">{p.claim}</p>
          <Meta p={p} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              backgroundColor: happened
                ? "color-mix(in srgb, var(--color-yes) 12%, transparent)"
                : "color-mix(in srgb, var(--color-no) 12%, transparent)",
              color: happened ? "var(--color-yes)" : "var(--color-no)",
            }}
          >
            {happened ? "Happened" : "Didn't happen"}
          </span>
          <span className="text-xs text-faint">
            said <span className="font-mono text-muted">{pct(p.probability)}</span>
          </span>
        </div>
      </div>

      <details className="group mt-2 text-sm">
        <summary className="cursor-pointer list-none text-xs text-faint transition-colors hover:text-muted">
          <span className="group-open:hidden">▸ </span>
          <span className="hidden group-open:inline">▾ </span>
          What I thought at the time · surprise {num(surprise, 2)}
        </summary>
        <div className="mt-2 space-y-1.5">
          {p.base_rate_pct !== null && <BaseRateGap p={p} />}
          {p.base_rate && <Field label="Base rate">{p.base_rate}</Field>}
          {p.reasoning && <Field label="Reasoning">{p.reasoning}</Field>}
          {p.what_would_change_my_mind && (
            <Field label="Would change my mind">
              {p.what_would_change_my_mind}
            </Field>
          )}
          {p.resolution_notes && (
            <Field label="Resolution">{p.resolution_notes}</Field>
          )}
          <div className="pt-1 text-right">
            <DeleteButton id={p.id} />
          </div>
        </div>
      </details>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="text-ink/90">
      <span className="text-faint">{label}:</span> {children}
    </p>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center text-sm text-muted">
      {children}
    </div>
  );
}
