// Curated "forecasting question" bank — pure, no I/O, so it's unit-testable.
//
// Suggestions are ready-made prediction prompts the user can one-click into the
// wizard. Claims are written EVERGREEN (recurring events, relative framings)
// and resolve dates are COMPUTED from `today`, so the bank doesn't go stale the
// way hardcoded price levels and fixed dates would.

export type Horizon =
  | "next-month-end"
  | "plus-1-month"
  | "plus-2-months"
  | "plus-3-months"
  | "quarter-end"
  | "next-quarter-start"
  | "year-end";

export interface SuggestionTemplate {
  id: string;
  category: string;
  /** Tags used to rank against the user's interest topics. */
  topics: string[];
  /** Self-contained claim. `{date}` (optional) is replaced with the resolve date. */
  claim: string;
  horizon: Horizon;
  /** Optional outside-view hint, 0..1. */
  baseRatePct?: number;
}

export interface Suggestion {
  id: string;
  claim: string;
  category: string;
  topics: string[];
  resolvesAt: string; // YYYY-MM-DD
  baseRatePct: number | null;
}

// ---------- date math (exported for tests) ----------

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function plusMonths(today: Date, n: number): Date {
  const y = today.getFullYear();
  const m = today.getMonth() + n;
  const daysInTarget = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(today.getDate(), daysInTarget));
}

export function resolveDate(horizon: Horizon, today: Date): Date {
  const y = today.getFullYear();
  const m = today.getMonth();
  switch (horizon) {
    case "plus-1-month":
      return plusMonths(today, 1);
    case "plus-2-months":
      return plusMonths(today, 2);
    case "plus-3-months":
      return plusMonths(today, 3);
    case "next-month-end":
      return new Date(y, m + 2, 0); // last day of next month
    case "quarter-end": {
      const endMonth = Math.floor(m / 3) * 3 + 2;
      return new Date(y, endMonth + 1, 0); // last day of current quarter
    }
    case "next-quarter-start": {
      const nextStart = (Math.floor(m / 3) + 1) * 3;
      return new Date(y, nextStart, 1); // rolls into next year if nextStart >= 12
    }
    case "year-end":
      return new Date(y, 11, 31);
  }
}

// ---------- the bank ----------

export const CURATED: SuggestionTemplate[] = [
  // Markets / stocks
  { id: "spx-year-double-digit", category: "markets", topics: ["markets", "stocks", "sp500", "index"], claim: "The S&P 500 ends the year up double digits (≥10% for the year)", horizon: "year-end", baseRatePct: 0.4 },
  { id: "spx-quarter-up", category: "markets", topics: ["markets", "stocks", "sp500", "index"], claim: "The S&P 500 finishes this quarter higher than it started", horizon: "quarter-end", baseRatePct: 0.58 },
  { id: "megacap-earnings-beat", category: "markets", topics: ["markets", "stocks", "earnings", "tech"], claim: "A megacap tech stock beats earnings consensus this quarter", horizon: "quarter-end", baseRatePct: 0.65 },
  { id: "startup-raise", category: "markets", topics: ["markets", "startups", "vc", "venture"], claim: "A startup you follow raises a new funding round this quarter", horizon: "quarter-end", baseRatePct: 0.35 },
  // Macro
  { id: "fed-cut", category: "macro", topics: ["macro", "fed", "rates", "interest rates"], claim: "The Fed cuts its policy rate at its next meeting", horizon: "plus-2-months", baseRatePct: 0.35 },
  { id: "cpi-below-3", category: "macro", topics: ["macro", "inflation", "cpi", "prices"], claim: "Headline CPI inflation comes in below 3% on the next print", horizon: "plus-1-month", baseRatePct: 0.4 },
  { id: "unemployment-up", category: "macro", topics: ["macro", "jobs", "unemployment", "labor"], claim: "The US unemployment rate ticks up on the next jobs report", horizon: "plus-1-month", baseRatePct: 0.35 },
  // Crypto
  { id: "btc-quarter-up", category: "markets", topics: ["crypto", "bitcoin", "btc"], claim: "Bitcoin ends the quarter higher than it started", horizon: "quarter-end", baseRatePct: 0.55 },
  { id: "eth-beats-btc", category: "markets", topics: ["crypto", "ethereum", "eth", "bitcoin"], claim: "Ethereum outperforms Bitcoin this quarter", horizon: "quarter-end", baseRatePct: 0.45 },
  // Commodities / energy
  { id: "oil-above-80", category: "markets", topics: ["oil", "energy", "commodities", "crude"], claim: "Brent crude averages above $80/bbl next month", horizon: "plus-1-month", baseRatePct: 0.5 },
  { id: "gold-new-high", category: "markets", topics: ["gold", "commodities", "metals"], claim: "Gold sets a new all-time high this quarter", horizon: "quarter-end", baseRatePct: 0.4 },
  // Tech / AI
  { id: "ai-flagship", category: "tech", topics: ["tech", "ai", "ml", "models"], claim: "A major AI lab ships a new flagship model this quarter", horizon: "quarter-end", baseRatePct: 0.6 },
  { id: "apple-event", category: "tech", topics: ["tech", "apple", "gadgets"], claim: "Apple announces a new product at its next event", horizon: "plus-3-months", baseRatePct: 0.7 },
  { id: "tech-layoffs", category: "tech", topics: ["tech", "business", "layoffs"], claim: "A major tech company announces layoffs this quarter", horizon: "quarter-end", baseRatePct: 0.5 },
  // Politics
  { id: "election-incumbent", category: "politics", topics: ["politics", "elections"], claim: "The incumbent wins the next major election you're following", horizon: "plus-3-months", baseRatePct: 0.6 },
  { id: "shutdown-avoided", category: "politics", topics: ["politics", "government", "budget"], claim: "A government shutdown is avoided before the next deadline", horizon: "plus-2-months", baseRatePct: 0.7 },
  // Sports
  { id: "team-playoffs", category: "sports", topics: ["sports"], claim: "Your team makes the playoffs this season", horizon: "plus-3-months", baseRatePct: 0.5 },
  { id: "favorite-wins", category: "sports", topics: ["sports", "championship"], claim: "The favorite wins the next championship you care about", horizon: "plus-3-months", baseRatePct: 0.4 },
  // Work
  { id: "project-on-time", category: "work", topics: ["work", "projects", "deadlines"], claim: "Your current project ships on time this quarter", horizon: "quarter-end", baseRatePct: 0.55 },
  { id: "quarter-goal", category: "work", topics: ["work", "goals", "okrs"], claim: "You hit your primary work goal this quarter", horizon: "quarter-end", baseRatePct: 0.5 },
  // Personal
  { id: "exercise-3x", category: "personal", topics: ["personal", "health", "fitness", "habits"], claim: "You exercise at least 3× per week every week this month", horizon: "next-month-end", baseRatePct: 0.55 },
  { id: "finish-book", category: "personal", topics: ["personal", "reading", "books", "habits"], claim: "You finish the book you're currently reading this month", horizon: "next-month-end", baseRatePct: 0.5 },
  { id: "inbox-zero", category: "personal", topics: ["personal", "productivity", "habits"], claim: "You keep your inbox under control all of next week", horizon: "plus-1-month", baseRatePct: 0.4 },
  { id: "outdoor-rain", category: "personal", topics: ["personal", "weather", "plans"], claim: "It rains on a day you have outdoor plans this month", horizon: "next-month-end", baseRatePct: 0.5 },
];

// ---------- materialize, rank, filter ----------

export function materialize(t: SuggestionTemplate, today: Date): Suggestion {
  const date = resolveDate(t.horizon, today);
  const iso = toISODate(date);
  return {
    id: t.id,
    claim: t.claim.replace("{date}", iso),
    category: t.category,
    topics: t.topics,
    resolvesAt: iso,
    baseRatePct: t.baseRatePct ?? null,
  };
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((w) => w.length > 2));
}

/** Jaccard similarity of word sets — used to skip near-duplicate claims. */
function similarity(a: string, b: string): number {
  const sa = tokens(a);
  const sb = tokens(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  return inter / (sa.size + sb.size - inter);
}

/** Count how many of a suggestion's tags/category match the user's topics. */
function interestScore(t: SuggestionTemplate, topics: string[]): number {
  if (topics.length === 0) return 0;
  const norm = topics.map(normalize).filter(Boolean);
  const tags = [t.category, ...t.topics].map(normalize);
  let score = 0;
  for (const tag of tags) {
    for (const topic of norm) {
      if (tag === topic || tag.includes(topic) || topic.includes(tag)) {
        score++;
        break;
      }
    }
  }
  return score;
}

export interface RankOptions {
  topics: string[];
  existingClaims: string[];
  today: Date;
  limit?: number;
  /** Defaults to CURATED; injectable for tests. */
  templates?: SuggestionTemplate[];
}

export function getCuratedSuggestions(opts: RankOptions): Suggestion[] {
  const { topics, existingClaims, today, limit = 6 } = opts;
  const templates = opts.templates ?? CURATED;

  const ranked = templates
    .map((t) => ({ t, score: interestScore(t, topics) }))
    // stable sort: higher interest first, then original order
    .map((x, i) => ({ ...x, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i);

  const out: Suggestion[] = [];
  for (const { t } of ranked) {
    if (out.length >= limit) break;
    const s = materialize(t, today);
    // skip anything close to something the user already logged
    const dup = existingClaims.some((c) => similarity(c, s.claim) >= 0.5);
    if (dup) continue;
    out.push(s);
  }
  return out;
}
