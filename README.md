# Decision Log

A personal **calibration journal**. Log a prediction *before* the outcome is
known, attach a probability, then resolve it later and watch how well-calibrated
you actually are over time.

Inspired by the forecasting / decision-science tradition — Tetlock's
*Superforecasting*, Kahneman's work on bias and the "outside view," and Ray
Dalio's idea of keeping an honest, scoreable track record.

The unit isn't "stocks." It's **any claim with a measurable yes/no outcome and a
resolution date**: markets, work deadlines, sports, "will I actually go to the
gym 3× this week."

## Why this is more than a spreadsheet

- **Force a probability.** "Likely" is unscoreable; `0.70` is. Probabilities
  below 50% are first-class — that's a prediction it *won't* happen.
- **Outside view first.** A base-rate / reference-class prompt before you reason
  about specifics (Kahneman).
- **Pre-commit your reasoning** and "what would change my mind," captured at
  prediction time so later review is immune to hindsight bias. Both are shown
  back to you when you resolve.
- **Score it.** Brier score, a calibration curve (do your 70% calls happen ~70%
  of the time?), and an over/under-confidence read.

## The metrics

- **Brier score** — mean squared error of probability vs. outcome. `0` is
  perfect, `0.25` is a coin flip, lower is better.
- **Calibration curve** — predictions bucketed by probability; each point plots
  predicted vs. actually-observed frequency. On the diagonal = calibrated; below
  = overconfident; above = underconfident. Dot size = number of predictions in
  the bucket (so a lucky 1/1 bucket isn't over-read).
- **Calibration error (ECE)** — average gap between forecast and reality.
- **Tendency** — whether you systematically over- or under-shoot.

All scoring lives in `src/lib/calibration.ts` as pure functions with
known-answer unit tests (`src/lib/calibration.test.ts`) — a calibration tool
that miscalibrates is worse than none, so the math is tested, not eyeballed.

## Tech

Next.js (App Router) · TypeScript · better-sqlite3 · Recharts · Tailwind ·
Vitest. Single-user, local, file-backed (SQLite at `data/decision_log.db`).

## Requirements

**Node 20+** (Next 16 requires it). This repo pins it via `.nvmrc`:

```bash
nvm use        # picks up .nvmrc -> Node 20
```

## Getting started

```bash
nvm use
npm install
npm run seed   # optional: ~18 sample resolved predictions so the chart has data
npm run dev    # http://localhost:3000
```

To start from an empty log, skip `npm run seed` (or delete
`data/decision_log.db` to reset).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:3000 |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Run the calibration unit tests |
| `npm run seed` | Insert sample resolved predictions (no-op if the DB is non-empty) |

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/predictions?status=open\|resolved` | List predictions |
| `POST` | `/api/predictions` | Create (`claim`, `probability` 0–1, optional fields) |
| `GET` | `/api/predictions/:id` | Fetch one |
| `PATCH` | `/api/predictions/:id` | Resolve (`outcome` 0 or 1, optional `resolution_notes`) |
| `DELETE` | `/api/predictions/:id` | Delete |
| `GET` | `/api/calibration?category=&bins=` | Summary + calibration curve |

## Suggested questions

The dashboard shows a feed of ready-made **forecasting questions** ("Will the Fed
cut at its next meeting?") that you can one-click into the wizard with **"Use
this →"** — it prefills the claim, category, resolve date, and a base-rate hint,
but **never your probability** (that stays yours, after the outside-view step).

- **Interest-ranked.** Questions are ranked by your **interest topics**, which
  seed from the categories you've already used and are editable inline on the
  dashboard.
- **Curated bank.** A hand-built, evergreen set with computed resolve dates —
  always available, no API key, no network.
- **Optional AI generation.** "✨ Generate more (AI)" calls an LLM to propose
  fresh questions for your topics. It's **dormant until you configure a key**
  (it tells you what's missing), and is **provider-agnostic**:

  ```bash
  # Anthropic (defaults to claude-opus-4-8)
  export LLM_PROVIDER=anthropic
  export ANTHROPIC_API_KEY=sk-ant-...

  # OpenAI
  export LLM_PROVIDER=openai
  export OPENAI_API_KEY=sk-...
  export LLM_MODEL=gpt-4o-mini

  # Groq (or any OpenAI-compatible endpoint via LLM_BASE_URL)
  export LLM_PROVIDER=groq
  export GROQ_API_KEY=gsk_...
  export LLM_MODEL=llama-3.3-70b-versatile
  ```

  Generation uses the model's own knowledge of your topics; it does **not** read
  live news (so the button is labelled "Generate more", not "from news").

## Calibration practice

Real predictions take months to resolve, so calibration feedback is slow. The
**Practice** tab (`/practice`) is the fast-feedback complement: answer a round of
built-in **true/false questions** with a probability, lock in, and see the answer
immediately. At the end you get a Brier score, calibration curve, and over/under-
confidence read for the round — using the **same scoring engine** as the real log,
but kept on a **separate track** (trivia ≠ real-world forecasting). Rounds are
saved so you can watch your practice calibration improve over time.

The question bank (`src/lib/calibrationQuestions.ts`) is deliberately limited to
**timeless, unambiguous facts** — a wrong answer key would train *anti*-calibration.

## Scope

MVP is **binary** predictions (yes/no), which give a clean Brier score and
calibration curve. Continuous/numeric forecasts ("S&P closes at X") need
interval calibration — a different scoring path — and are intentionally deferred.

## Storage

SQLite at `data/decision_log.db` (git-ignored). Override the path with the
`DECISION_LOG_DB` environment variable.
