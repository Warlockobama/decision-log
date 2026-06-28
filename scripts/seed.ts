// Seed the log with realistic, already-resolved predictions so the dashboard
// and calibration chart have something to render. Run with: npm run seed
//
// The fake forecaster here is deliberately a bit OVERCONFIDENT on high-
// probability calls, so the calibration curve bends below the diagonal at the
// top end — i.e. the tool visibly "works" on imperfect data.
import { createPrediction, db, resolvePrediction } from "@/lib/db";
import type { NewPredictionInput } from "@/lib/types";

type Seed = NewPredictionInput & { outcome: 0 | 1; resolution_notes?: string };

const seeds: Seed[] = [
  {
    claim: "AAPL closes above $220 by end of Q2 2026",
    probability: 0.65,
    category: "markets",
    base_rate: "Up ~55% of quarters historically; currently near $210.",
    reasoning: "Strong services growth, buybacks; but valuation stretched.",
    what_would_change_my_mind: "A guidance cut or broad market selloff.",
    outcome: 1,
    resolution_notes: "Closed at $228.",
  },
  {
    claim: "The Fed cuts rates at the June 2026 meeting",
    probability: 0.4,
    category: "macro",
    base_rate: "Markets pricing ~35% from fed funds futures.",
    reasoning: "Inflation sticky; labor still firm.",
    what_would_change_my_mind: "A weak jobs report before the meeting.",
    outcome: 0,
    resolution_notes: "Held steady.",
  },
  {
    claim: "Our Q1 release ships before March 31",
    probability: 0.8,
    category: "work",
    base_rate: "We hit our last 3 of 5 quarterly dates.",
    reasoning: "Scope is locked and the team is fully staffed.",
    what_would_change_my_mind: "A P0 bug found in QA week.",
    outcome: 0,
    resolution_notes: "Slipped two weeks; an integration bug.",
  },
  {
    claim: "I exercise at least 3x per week this month",
    probability: 0.7,
    category: "personal",
    base_rate: "Managed it ~60% of past months.",
    reasoning: "Booked classes in advance this time.",
    what_would_change_my_mind: "Travel or getting sick.",
    outcome: 1,
  },
  {
    claim: "Bitcoin is above $100k on July 1 2026",
    probability: 0.55,
    category: "markets",
    base_rate: "Roughly coin-flip given recent range.",
    reasoning: "ETF inflows steady; halving tailwind fading.",
    what_would_change_my_mind: "A major exchange failure.",
    outcome: 1,
  },
  {
    claim: "The incumbent wins the city mayoral race",
    probability: 0.85,
    category: "politics",
    base_rate: "Incumbents win ~75% of local races.",
    reasoning: "Strong approval, weak challenger, big cash lead.",
    what_would_change_my_mind: "A late scandal.",
    outcome: 1,
  },
  {
    claim: "Our A/B test shows a >2% lift in signups",
    probability: 0.45,
    category: "work",
    base_rate: "About 1 in 3 of our tests reach significance.",
    reasoning: "The new flow tested well in usability sessions.",
    what_would_change_my_mind: "Flat early numbers in week one.",
    outcome: 0,
    resolution_notes: "Lift was +0.4%, not significant.",
  },
  {
    claim: "It rains in Seattle on my outdoor event date",
    probability: 0.6,
    category: "personal",
    base_rate: "~60% of days that month are rainy.",
    reasoning: "Forecast leans wet but uncertain a week out.",
    what_would_change_my_mind: "A stable high-pressure system.",
    outcome: 0,
  },
  {
    claim: "NVDA beats earnings consensus this quarter",
    probability: 0.75,
    category: "markets",
    base_rate: "Beat in 9 of last 10 quarters.",
    reasoning: "Datacenter demand still outstripping supply.",
    what_would_change_my_mind: "Channel checks showing order pushouts.",
    outcome: 1,
  },
  {
    claim: "I finish reading 'Thinking, Fast and Slow' this month",
    probability: 0.5,
    category: "personal",
    base_rate: "I finish maybe half the books I start.",
    reasoning: "Only 150 pages left.",
    what_would_change_my_mind: "A busy stretch at work.",
    outcome: 0,
  },
  {
    claim: "The S&P 500 ends the year up double digits",
    probability: 0.5,
    category: "markets",
    base_rate: "Double-digit up years ~45% of the time.",
    reasoning: "Earnings growth ok, but multiples high.",
    what_would_change_my_mind: "A recession signal.",
    outcome: 1,
  },
  {
    claim: "We hire a senior engineer by end of quarter",
    probability: 0.6,
    category: "work",
    base_rate: "Senior hires take ~2 quarters on average.",
    reasoning: "Two strong candidates in final rounds.",
    what_would_change_my_mind: "Both decline our offer.",
    outcome: 1,
  },
  {
    claim: "Inflation (CPI) prints below 3% next month",
    probability: 0.3,
    category: "macro",
    base_rate: "Has been above 3% for most of the past year.",
    reasoning: "Shelter costs still elevated.",
    what_would_change_my_mind: "A sharp drop in energy prices.",
    outcome: 0,
  },
  {
    claim: "My flight on Friday departs on time",
    probability: 0.7,
    category: "personal",
    base_rate: "~75% of flights on that route leave on time.",
    reasoning: "Early morning slot, good weather forecast.",
    what_would_change_my_mind: "A storm system moving in.",
    outcome: 1,
  },
  {
    claim: "The startup we track raises a Series B this half",
    probability: 0.35,
    category: "markets",
    base_rate: "Most startups take >18 months between rounds.",
    reasoning: "Strong growth but tough funding climate.",
    what_would_change_my_mind: "A lead investor announced.",
    outcome: 1,
    resolution_notes: "Surprised me — raised in May.",
  },
  {
    claim: "I keep my inbox under 20 emails all week",
    probability: 0.4,
    category: "personal",
    base_rate: "Rarely manage this — maybe 1 week in 4.",
    reasoning: "Trying a new triage routine.",
    what_would_change_my_mind: "A big launch landing midweek.",
    outcome: 0,
  },
  {
    claim: "Our cloud bill drops after the migration",
    probability: 0.9,
    category: "work",
    base_rate: "Most rightsizing efforts cut costs.",
    reasoning: "Reserved instances + dropping idle nodes.",
    what_would_change_my_mind: "Hidden egress costs.",
    outcome: 0,
    resolution_notes: "Egress charges ate the savings.",
  },
  {
    claim: "Gold closes above $2,500/oz this quarter",
    probability: 0.8,
    category: "markets",
    base_rate: "Already near $2,450 with upward momentum.",
    reasoning: "Central-bank buying and rate-cut hopes.",
    what_would_change_my_mind: "A sharp dollar rally.",
    outcome: 1,
  },
];

function run() {
  const existing = db.prepare("SELECT COUNT(*) AS n FROM predictions").get() as {
    n: number;
  };
  if (existing.n > 0) {
    console.log(
      `Database already has ${existing.n} prediction(s); skipping seed. ` +
        `Delete data/decision_log.db to reseed.`,
    );
    return;
  }
  let n = 0;
  for (const s of seeds) {
    const { outcome, resolution_notes, ...input } = s;
    const created = createPrediction(input);
    resolvePrediction(created.id, { outcome, resolution_notes });
    n++;
  }
  console.log(`Seeded ${n} resolved predictions.`);
}

run();
