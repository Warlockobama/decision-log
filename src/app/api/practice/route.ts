import { NextRequest, NextResponse } from "next/server";
import { createCalibrationSession } from "@/lib/db";
import { pickQuestions, scoreSession, type SessionAnswer } from "@/lib/calibrationSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Start a new round: return n questions. Answers are included (single-user,
// local app); the UI keeps them hidden until the user locks in each guess.
export function GET(req: NextRequest) {
  const n = Math.min(20, Math.max(3, Number(req.nextUrl.searchParams.get("n")) || 10));
  const questions = pickQuestions(n).map((q) => ({
    id: q.id,
    statement: q.statement,
    answer: q.answer,
    topic: q.topic,
    note: q.note ?? null,
  }));
  return NextResponse.json({ questions });
}

// Submit a completed round. The true answers are looked up server-side, so the
// score is authoritative regardless of what the client sends.
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = (body as { answers?: unknown }).answers;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "answers must be an array" }, { status: 400 });
  }
  const answers: SessionAnswer[] = raw
    .map((a) => a as Record<string, unknown>)
    .filter((a) => typeof a.id === "string" && Number.isFinite(Number(a.probability)))
    .map((a) => ({ id: a.id as string, probability: Number(a.probability) }));

  if (answers.length === 0) {
    return NextResponse.json({ error: "no valid answers" }, { status: 400 });
  }

  const result = scoreSession(answers);
  createCalibrationSession({
    count: result.count,
    brier: result.summary.brier,
    ece: result.summary.ece,
    bias: result.summary.bias,
    items: JSON.stringify(result.items),
  });
  return NextResponse.json(result);
}
