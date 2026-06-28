import { NextRequest, NextResponse } from "next/server";
import { createPrediction, listPredictions } from "@/lib/db";
import type { PredictionStatus } from "@/lib/types";

// better-sqlite3 requires the Node.js runtime (not edge), and reads must not
// be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const statusParam = req.nextUrl.searchParams.get("status");
  const status =
    statusParam === "open" || statusParam === "resolved"
      ? (statusParam as PredictionStatus)
      : undefined;
  return NextResponse.json(listPredictions(status));
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const claim = typeof b.claim === "string" ? b.claim.trim() : "";
  const probability =
    typeof b.probability === "number" ? b.probability : Number(b.probability);

  if (!claim) {
    return NextResponse.json({ error: "claim is required" }, { status: 400 });
  }
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    return NextResponse.json(
      { error: "probability must be a number between 0 and 1" },
      { status: 400 },
    );
  }

  const baseRatePct =
    b.base_rate_pct === null || b.base_rate_pct === undefined || b.base_rate_pct === ""
      ? null
      : Number(b.base_rate_pct);
  if (
    baseRatePct !== null &&
    (!Number.isFinite(baseRatePct) || baseRatePct < 0 || baseRatePct > 1)
  ) {
    return NextResponse.json(
      { error: "base_rate_pct must be a number between 0 and 1" },
      { status: 400 },
    );
  }

  const created = createPrediction({
    claim,
    probability,
    category: str(b.category),
    base_rate: str(b.base_rate),
    base_rate_pct: baseRatePct,
    reasoning: str(b.reasoning),
    what_would_change_my_mind: str(b.what_would_change_my_mind),
    resolves_at: str(b.resolves_at),
  });
  return NextResponse.json(created, { status: 201 });
}

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}
