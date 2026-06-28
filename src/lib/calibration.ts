// Pure calibration math. No I/O, no framework imports — so it can be unit
// tested with known-answer cases. A calibration tool that miscalibrates is
// worse than none, so this module is the part that must be correct.
//
// Conventions:
//   probability = P(event as stated), in [0, 1]
//   outcome     = 1 if the event happened, 0 if it did not
// Predictions below 0.5 are valid and carry calibration signal; we never
// threshold at 0.5 to compute a notion of "accuracy".

export interface ScoredPrediction {
  probability: number;
  outcome: 0 | 1;
}

export interface CalibrationBin {
  /** Lower edge of the bin, inclusive (e.g. 0.7). */
  lo: number;
  /** Upper edge of the bin, exclusive except for the final bin (e.g. 0.8). */
  hi: number;
  /** Human label, e.g. "70–80%". */
  label: string;
  /** Number of resolved predictions that fell in this bin. */
  count: number;
  /** Mean forecast probability of predictions in this bin (null if empty). */
  meanPredicted: number | null;
  /** Observed fraction that actually happened (null if empty). */
  observedFrequency: number | null;
}

export interface CalibrationSummary {
  /** Resolved predictions scored. */
  count: number;
  /** Mean squared error of probability vs outcome. 0 = perfect, 1 = worst. */
  brier: number | null;
  /**
   * Expected Calibration Error: count-weighted mean gap between forecast and
   * observed frequency across populated bins. 0 = perfectly calibrated.
   */
  ece: number | null;
  /** Average forecast probability across all scored predictions. */
  meanProbability: number | null;
  /** Overall fraction of predicted events that actually happened. */
  observedFrequency: number | null;
  /**
   * meanProbability - observedFrequency. Positive => you assigned more
   * probability than events delivered (overconfident / optimistic); negative
   * => underconfident / pessimistic.
   */
  bias: number | null;
}

function clampProb(p: number): number {
  if (Number.isNaN(p)) return 0;
  return Math.min(1, Math.max(0, p));
}

export function brierScore(items: ScoredPrediction[]): number | null {
  if (items.length === 0) return null;
  const sum = items.reduce((acc, it) => {
    const p = clampProb(it.probability);
    return acc + (p - it.outcome) ** 2;
  }, 0);
  return sum / items.length;
}

function binLabel(lo: number, hi: number): string {
  return `${Math.round(lo * 100)}–${Math.round(hi * 100)}%`;
}

export function calibrationCurve(
  items: ScoredPrediction[],
  binCount = 10,
): CalibrationBin[] {
  const bins: CalibrationBin[] = [];
  for (let i = 0; i < binCount; i++) {
    const lo = i / binCount;
    const hi = (i + 1) / binCount;
    bins.push({
      lo,
      hi,
      label: binLabel(lo, hi),
      count: 0,
      meanPredicted: null,
      observedFrequency: null,
    });
  }

  const sums = bins.map(() => ({ p: 0, o: 0, n: 0 }));
  for (const it of items) {
    const p = clampProb(it.probability);
    // p === 1 lands in the final bin rather than overflowing.
    const idx = Math.min(binCount - 1, Math.floor(p * binCount));
    sums[idx].p += p;
    sums[idx].o += it.outcome;
    sums[idx].n += 1;
  }

  for (let i = 0; i < binCount; i++) {
    const { p, o, n } = sums[i];
    bins[i].count = n;
    if (n > 0) {
      bins[i].meanPredicted = p / n;
      bins[i].observedFrequency = o / n;
    }
  }
  return bins;
}

export function calibrationSummary(
  items: ScoredPrediction[],
  binCount = 10,
): CalibrationSummary {
  const count = items.length;
  if (count === 0) {
    return {
      count: 0,
      brier: null,
      ece: null,
      meanProbability: null,
      observedFrequency: null,
      bias: null,
    };
  }

  const meanProbability =
    items.reduce((a, it) => a + clampProb(it.probability), 0) / count;
  const observedFrequency = items.reduce((a, it) => a + it.outcome, 0) / count;
  const brier = brierScore(items)!;

  const bins = calibrationCurve(items, binCount);
  const populated = bins.filter((b) => b.count > 0);

  // Expected Calibration Error: count-weighted |forecast - observed|.
  const ece =
    populated.reduce(
      (a, b) => a + b.count * Math.abs(b.meanPredicted! - b.observedFrequency!),
      0,
    ) / count;

  return {
    count,
    brier,
    ece,
    meanProbability,
    observedFrequency,
    bias: meanProbability - observedFrequency,
  };
}
