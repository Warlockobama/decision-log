// Display helpers shared by server and client components (no I/O).

export function pct(p: number | null, digits = 0): string {
  if (p === null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(digits)}%`;
}

export function num(n: number | null, digits = 3): string {
  if (n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  };
  // Date-only ("YYYY-MM-DD"): build a LOCAL date so a UTC-midnight parse can't
  // shift it to the previous day in timezones behind UTC.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(+y, +m - 1, +d).toLocaleDateString(undefined, opts);
  }
  // SQLite datetime('now') yields "YYYY-MM-DD HH:MM:SS" in UTC.
  const d = new Date(iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, opts);
}

/** Plain-language read on the bias number. */
export function biasLabel(bias: number | null): {
  text: string;
  tone: "neutral" | "over" | "under";
} {
  // NOTE: bias ~ 0 means no *systematic* over/under-shoot — it does NOT mean
  // well calibrated (you can be maximally overconfident with zero net bias).
  // Calibration quality is the ECE/curve; this label is only about direction.
  if (bias === null) return { text: "Not enough data", tone: "neutral" };
  if (Math.abs(bias) < 0.03) return { text: "No systematic bias", tone: "neutral" };
  if (bias > 0)
    return {
      text: `Overconfident by ${(bias * 100).toFixed(0)} pts`,
      tone: "over",
    };
  return {
    text: `Underconfident by ${(Math.abs(bias) * 100).toFixed(0)} pts`,
    tone: "under",
  };
}
