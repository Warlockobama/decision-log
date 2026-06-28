import { describe, it, expect } from "vitest";
import {
  brierScore,
  calibrationCurve,
  calibrationSummary,
  type ScoredPrediction,
} from "./calibration";

const p = (probability: number, outcome: 0 | 1): ScoredPrediction => ({
  probability,
  outcome,
});

describe("brierScore", () => {
  it("returns null for an empty set", () => {
    expect(brierScore([])).toBeNull();
  });

  it("is 0 for perfect, certain predictions", () => {
    expect(brierScore([p(1, 1), p(0, 0), p(1, 1)])).toBe(0);
  });

  it("is 1 for confident-and-always-wrong predictions", () => {
    expect(brierScore([p(1, 0), p(0, 1), p(1, 0)])).toBe(1);
  });

  it("is 0.25 when everything is hedged at 0.5", () => {
    expect(brierScore([p(0.5, 1), p(0.5, 0)])).toBe(0.25);
  });

  it("computes the mean squared error", () => {
    // (0.8-1)^2=0.04, (0.3-0)^2=0.09 -> mean 0.065
    expect(brierScore([p(0.8, 1), p(0.3, 0)])).toBeCloseTo(0.065, 10);
  });

  it("clamps out-of-range probabilities into [0,1]", () => {
    expect(brierScore([p(1.5, 1)])).toBe(0); // clamped to 1
    expect(brierScore([p(-0.5, 0)])).toBe(0); // clamped to 0
  });
});

describe("calibrationCurve", () => {
  it("creates the requested number of bins covering [0,1]", () => {
    const bins = calibrationCurve([], 10);
    expect(bins).toHaveLength(10);
    expect(bins[0].lo).toBe(0);
    expect(bins[9].hi).toBe(1);
    expect(bins[7].label).toBe("70–80%");
  });

  it("puts a 70% bucket that resolves 7/10 right on the diagonal", () => {
    const items: ScoredPrediction[] = [
      ...Array(7).fill(p(0.7, 1)),
      ...Array(3).fill(p(0.7, 0)),
    ];
    const bins = calibrationCurve(items, 10);
    const bucket = bins[7]; // 0.70 -> index floor(0.7*10)=7
    expect(bucket.count).toBe(10);
    expect(bucket.meanPredicted).toBeCloseTo(0.7, 10);
    expect(bucket.observedFrequency).toBeCloseTo(0.7, 10);
  });

  it("places probability exactly 1 in the final bin, not an overflow", () => {
    const bins = calibrationCurve([p(1, 1)], 10);
    expect(bins[9].count).toBe(1);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(1);
  });

  it("leaves empty bins null so a 1/1 bucket isn't over-read as 0", () => {
    const bins = calibrationCurve([p(0.05, 0)], 10);
    expect(bins[0].count).toBe(1);
    expect(bins[0].observedFrequency).toBe(0);
    expect(bins[5].count).toBe(0);
    expect(bins[5].observedFrequency).toBeNull();
  });
});

describe("calibrationSummary", () => {
  it("is empty/neutral for no data", () => {
    const s = calibrationSummary([]);
    expect(s.count).toBe(0);
    expect(s.brier).toBeNull();
    expect(s.bias).toBeNull();
  });

  it("flags overconfidence: high forecasts, low realization", () => {
    // Predicts 0.9 ten times, only 5 happen.
    const items = [...Array(5).fill(p(0.9, 1)), ...Array(5).fill(p(0.9, 0))];
    const s = calibrationSummary(items);
    expect(s.meanProbability).toBeCloseTo(0.9, 10);
    expect(s.observedFrequency).toBeCloseTo(0.5, 10);
    expect(s.bias!).toBeGreaterThan(0); // overconfident / optimistic
  });

  it("flags underconfidence: low forecasts, high realization", () => {
    const items = [...Array(8).fill(p(0.4, 1)), ...Array(2).fill(p(0.4, 0))];
    const s = calibrationSummary(items);
    expect(s.bias!).toBeLessThan(0);
  });

  it("gives a perfectly calibrated set ~0 calibration error", () => {
    // Each bin's forecast equals its realized frequency.
    const items: ScoredPrediction[] = [
      ...Array(9).fill(p(0.9, 1)),
      p(0.9, 0), // 0.9 bucket: 9/10 -> matches 90% forecast
      p(0.1, 1),
      ...Array(9).fill(p(0.1, 0)), // 0.1 bucket: 1/10 -> matches 10% forecast
    ];
    const s = calibrationSummary(items);
    expect(s.ece!).toBeCloseTo(0, 10);
    expect(Math.abs(s.bias!)).toBeCloseTo(0, 10);
  });
});
