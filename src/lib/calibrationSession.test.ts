import { describe, it, expect } from "vitest";
import { pickQuestions, scoreSession } from "./calibrationSession";
import { QUESTIONS, type CalibrationQuestion } from "./calibrationQuestions";

// deterministic RNG for reproducible shuffles
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const POOL: CalibrationQuestion[] = [
  { id: "t1", statement: "True one", answer: true, topic: "x" },
  { id: "t2", statement: "True two", answer: true, topic: "x" },
  { id: "f1", statement: "False one", answer: false, topic: "x" },
  { id: "f2", statement: "False two", answer: false, topic: "x" },
];

describe("pickQuestions", () => {
  it("returns n distinct questions", () => {
    const out = pickQuestions(3, lcg(1), POOL);
    expect(out).toHaveLength(3);
    expect(new Set(out.map((q) => q.id)).size).toBe(3);
  });

  it("is deterministic for a given rng seed", () => {
    const a = pickQuestions(4, lcg(42), POOL).map((q) => q.id);
    const b = pickQuestions(4, lcg(42), POOL).map((q) => q.id);
    expect(a).toEqual(b);
  });

  it("clamps n to the pool size", () => {
    expect(pickQuestions(99, lcg(1), POOL)).toHaveLength(POOL.length);
  });
});

describe("scoreSession", () => {
  it("looks up the true answer by id (client can't fake the outcome)", () => {
    const r = scoreSession([{ id: "t1", probability: 0.9 }], POOL);
    expect(r.items[0].outcome).toBe(1); // t1 is true
    const r2 = scoreSession([{ id: "f1", probability: 0.9 }], POOL);
    expect(r2.items[0].outcome).toBe(0); // f1 is false
  });

  it("rewards confident-correct with a low Brier", () => {
    const r = scoreSession(
      [
        { id: "t1", probability: 0.95 },
        { id: "f1", probability: 0.05 },
      ],
      POOL,
    );
    expect(r.summary.brier!).toBeLessThan(0.02);
  });

  it("punishes confident-wrong with a high Brier", () => {
    const r = scoreSession(
      [
        { id: "t1", probability: 0.05 }, // said false, was true
        { id: "f1", probability: 0.95 }, // said true, was false
      ],
      POOL,
    );
    expect(r.summary.brier!).toBeGreaterThan(0.9);
  });

  it("ignores unknown ids", () => {
    const r = scoreSession([{ id: "nope", probability: 0.5 }], POOL);
    expect(r.count).toBe(0);
  });
});

describe("question bank integrity", () => {
  it("has a healthy number of questions", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(24);
  });

  it("every entry has a unique id, boolean answer, and non-empty statement", () => {
    const ids = new Set<string>();
    for (const q of QUESTIONS) {
      expect(typeof q.answer).toBe("boolean");
      expect(q.statement.trim().length).toBeGreaterThan(0);
      expect(ids.has(q.id)).toBe(false);
      ids.add(q.id);
    }
  });

  it("is reasonably balanced between true and false", () => {
    const trues = QUESTIONS.filter((q) => q.answer).length;
    const ratio = trues / QUESTIONS.length;
    expect(ratio).toBeGreaterThan(0.35);
    expect(ratio).toBeLessThan(0.65);
  });
});
