import { describe, it, expect } from "vitest";
import { biasLabel, formatDate, num, pct } from "./format";

// NOTE: the test script forces TZ=America/Los_Angeles (behind UTC). The
// date-only regression below is vacuous under UTC — a UTC-midnight parse only
// shifts to the previous day in a behind-UTC zone — so the zone is required.

describe("formatDate", () => {
  it("renders a date-only string without an off-by-one shift", () => {
    // The bug rendered "2026-09-30" as Sep 29 (UTC midnight viewed in LA).
    const out = formatDate("2026-09-30");
    expect(out).toContain("30");
    expect(out).toContain("Sep");
  });

  it("handles year/month boundaries for date-only input", () => {
    expect(formatDate("2026-01-01")).toContain("1");
    expect(formatDate("2026-01-01")).toContain("Jan");
  });

  it("parses a SQLite UTC datetime ('YYYY-MM-DD HH:MM:SS')", () => {
    expect(formatDate("2026-06-15 18:00:00")).toContain("2026");
  });

  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });
});

describe("pct / num", () => {
  it("formats fractions as percentages", () => {
    expect(pct(0.65)).toBe("65%");
    expect(pct(0.3, 1)).toBe("30.0%");
  });
  it("renders dashes for null", () => {
    expect(pct(null)).toBe("—");
    expect(num(null)).toBe("—");
  });
});

describe("biasLabel", () => {
  it("does NOT call near-zero bias 'calibrated' (bias != calibration)", () => {
    expect(biasLabel(0.01).text.toLowerCase()).not.toContain("calibrated");
  });
  it("flags over- and under-confidence direction", () => {
    expect(biasLabel(0.2).tone).toBe("over");
    expect(biasLabel(-0.2).tone).toBe("under");
  });
  it("is neutral with no data", () => {
    expect(biasLabel(null).tone).toBe("neutral");
  });
});
