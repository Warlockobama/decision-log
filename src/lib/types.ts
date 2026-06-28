// Core domain types for the decision/calibration log.
//
// MVP scope: BINARY predictions only. Every prediction states an event,
// `probability` is P(event as stated) in [0,1], and `outcome` is 1 if the
// event happened and 0 if it did not. Predictions below 0.5 are first-class
// ("30% chance the deal closes") — never collapse them with a 0.5 threshold.

export type PredictionStatus = "open" | "resolved";

export interface Prediction {
  id: number;
  claim: string;
  /** P(event as stated), 0..1 */
  probability: number;
  category: string | null;
  /** Outside view: the base rate for this reference class, captured up front. */
  base_rate: string | null;
  /** Optional numeric base rate (0..1) for the "X pts above base rate" nudge. */
  base_rate_pct: number | null;
  /** Reasoning recorded at prediction time (pre-commitment). */
  reasoning: string | null;
  /** What evidence would flip this forecast — captured before the outcome. */
  what_would_change_my_mind: string | null;
  created_at: string;
  resolves_at: string | null;
  status: PredictionStatus;
  /** 1 = event occurred, 0 = did not, null = still open. */
  outcome: 0 | 1 | null;
  resolved_at: string | null;
  resolution_notes: string | null;
}

export interface NewPredictionInput {
  claim: string;
  probability: number;
  category?: string | null;
  base_rate?: string | null;
  base_rate_pct?: number | null;
  reasoning?: string | null;
  what_would_change_my_mind?: string | null;
  resolves_at?: string | null;
}

export interface ResolveInput {
  outcome: 0 | 1;
  resolution_notes?: string | null;
}
