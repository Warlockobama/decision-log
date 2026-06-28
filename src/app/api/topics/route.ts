import { NextRequest, NextResponse } from "next/server";
import { getTopics, setTopics } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getTopics());
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const raw = (body as { topics?: unknown }).topics;
  if (!Array.isArray(raw)) {
    return NextResponse.json({ error: "topics must be an array" }, { status: 400 });
  }
  // normalize: strings, trimmed, deduped, capped
  const topics = Array.from(
    new Set(
      raw
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 24);
  setTopics(topics);
  return NextResponse.json({ topics, seeded: false });
}
