import { NextRequest, NextResponse } from "next/server";
import { listPredictions } from "@/lib/db";
import {
  calibrationCurve,
  calibrationSummary,
  type ScoredPrediction,
} from "@/lib/calibration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const binCount = Number(req.nextUrl.searchParams.get("bins")) || 10;

  const resolved = listPredictions("resolved").filter(
    (p) =>
      p.outcome !== null && (!category || category === "all" || p.category === category),
  );

  const scored: ScoredPrediction[] = resolved.map((p) => ({
    probability: p.probability,
    outcome: p.outcome as 0 | 1,
  }));

  return NextResponse.json({
    summary: calibrationSummary(scored, binCount),
    curve: calibrationCurve(scored, binCount),
  });
}
