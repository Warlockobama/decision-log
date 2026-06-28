import { NextResponse } from "next/server";
import { listCalibrationSessions } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ sessions: listCalibrationSessions(20) });
}
