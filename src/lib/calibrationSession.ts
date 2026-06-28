// Pure logic for a calibration-practice round. Reuses the same scoring engine
// as the real prediction log (calibration.ts) so practice and forecasting are
// measured identically.

import {
  calibrationCurve,
  calibrationSummary,
  type CalibrationBin,
  type CalibrationSummary,
  type ScoredPrediction,
} from "./calibration";
import { QUESTIONS, type CalibrationQuestion } from "./calibrationQuestions";

/** Deterministic Fisher–Yates shuffle (rng injectable for tests), take n. */
export function pickQuestions(
  n: number,
  rng: () => number = Math.random,
  pool: CalibrationQuestion[] = QUESTIONS,
): CalibrationQuestion[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, Math.min(Math.max(0, n), arr.length));
}

/** One answer: the user's probability (0..1) that the statement is TRUE. */
export interface SessionAnswer {
  id: string;
  probability: number;
}

export interface ScoredItem {
  id: string;
  statement: string;
  probability: number;
  outcome: 0 | 1; // 1 if the statement is actually true
  note?: string;
}

export interface SessionResult {
  count: number;
  summary: CalibrationSummary;
  curve: CalibrationBin[];
  items: ScoredItem[];
}

function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(1, Math.max(0, p));
}

/**
 * Score a completed round. The TRUE answer is looked up from the bank by id —
 * the caller can't smuggle in a wrong outcome.
 */
export function scoreSession(
  answers: SessionAnswer[],
  pool: CalibrationQuestion[] = QUESTIONS,
): SessionResult {
  const byId = new Map(pool.map((q) => [q.id, q]));
  const items: ScoredItem[] = [];
  const scored: ScoredPrediction[] = [];
  for (const a of answers) {
    const q = byId.get(a.id);
    if (!q) continue;
    const outcome: 0 | 1 = q.answer ? 1 : 0;
    const p = clamp01(a.probability);
    items.push({ id: q.id, statement: q.statement, probability: p, outcome, note: q.note });
    scored.push({ probability: p, outcome });
  }
  return {
    count: scored.length,
    summary: calibrationSummary(scored),
    curve: calibrationCurve(scored),
    items,
  };
}
