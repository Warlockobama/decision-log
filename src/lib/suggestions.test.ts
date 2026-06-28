import { describe, it, expect } from "vitest";
import {
  getCuratedSuggestions,
  materialize,
  resolveDate,
  toISODate,
  type SuggestionTemplate,
} from "./suggestions";

const T = (over: Partial<SuggestionTemplate> = {}): SuggestionTemplate => ({
  id: "x",
  category: "markets",
  topics: ["markets"],
  claim: "Something happens",
  horizon: "quarter-end",
  ...over,
});

describe("resolveDate", () => {
  const jun15 = new Date(2026, 5, 15); // 2026-06-15 (Q2)

  it("quarter-end is the last day of the current quarter", () => {
    expect(toISODate(resolveDate("quarter-end", jun15))).toBe("2026-06-30");
  });

  it("next-quarter-start is the first day of the next quarter", () => {
    expect(toISODate(resolveDate("next-quarter-start", jun15))).toBe("2026-07-01");
  });

  it("next-quarter-start rolls into next year from Q4", () => {
    const nov = new Date(2026, 10, 3); // November -> Q4
    expect(toISODate(resolveDate("next-quarter-start", nov))).toBe("2027-01-01");
  });

  it("year-end is Dec 31", () => {
    expect(toISODate(resolveDate("year-end", jun15))).toBe("2026-12-31");
  });

  it("next-month-end is the last day of next month", () => {
    expect(toISODate(resolveDate("next-month-end", jun15))).toBe("2026-07-31");
  });

  it("plus-N-months clamps the day to the target month length", () => {
    const jan31 = new Date(2026, 0, 31);
    // +1 month from Jan 31 should clamp to Feb 28, not spill into March
    expect(toISODate(resolveDate("plus-1-month", jan31))).toBe("2026-02-28");
  });
});

describe("materialize", () => {
  it("fills the resolve date and {date} token", () => {
    const s = materialize(
      T({ claim: "X by {date}", horizon: "year-end", baseRatePct: 0.3 }),
      new Date(2026, 5, 15),
    );
    expect(s.claim).toBe("X by 2026-12-31");
    expect(s.resolvesAt).toBe("2026-12-31");
    expect(s.baseRatePct).toBe(0.3);
  });

  it("base rate is null when the template omits it", () => {
    expect(materialize(T(), new Date(2026, 0, 1)).baseRatePct).toBeNull();
  });
});

describe("getCuratedSuggestions", () => {
  const today = new Date(2026, 5, 15);
  const templates: SuggestionTemplate[] = [
    T({ id: "a", category: "markets", topics: ["stocks"], claim: "Stocks up" }),
    T({ id: "b", category: "sports", topics: ["sports"], claim: "Team wins" }),
    T({ id: "c", category: "personal", topics: ["fitness"], claim: "Gym 3x" }),
  ];

  it("ranks interest-matching templates first", () => {
    const out = getCuratedSuggestions({
      topics: ["fitness"],
      existingClaims: [],
      today,
      templates,
      limit: 3,
    });
    expect(out[0].id).toBe("c");
  });

  it("preserves order when no topics match (neutral)", () => {
    const out = getCuratedSuggestions({
      topics: ["politics"],
      existingClaims: [],
      today,
      templates,
    });
    expect(out.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("respects the limit", () => {
    const out = getCuratedSuggestions({
      topics: [],
      existingClaims: [],
      today,
      templates,
      limit: 2,
    });
    expect(out).toHaveLength(2);
  });

  it("filters out near-duplicates of existing claims", () => {
    const out = getCuratedSuggestions({
      topics: [],
      existingClaims: ["Team wins the final"],
      today,
      templates,
    });
    expect(out.find((s) => s.id === "b")).toBeUndefined();
  });

  it("topic matching is case-insensitive and substring-aware", () => {
    const out = getCuratedSuggestions({
      topics: ["STOCK"],
      existingClaims: [],
      today,
      templates,
      limit: 1,
    });
    expect(out[0].id).toBe("a");
  });
});
