import { NextRequest, NextResponse } from "next/server";
import { deletePrediction, getPrediction, resolvePrediction } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  const p = getPrediction(id);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(p);
}

// Resolve a prediction by recording its outcome.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const b = body as Record<string, unknown>;
  const outcome = Number(b.outcome);
  if (outcome !== 0 && outcome !== 1) {
    return NextResponse.json(
      { error: "outcome must be 0 (did not happen) or 1 (happened)" },
      { status: 400 },
    );
  }
  const notes = typeof b.resolution_notes === "string" ? b.resolution_notes : null;
  const updated = resolvePrediction(id, {
    outcome: outcome as 0 | 1,
    resolution_notes: notes,
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const id = Number((await params).id);
  const ok = deletePrediction(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
