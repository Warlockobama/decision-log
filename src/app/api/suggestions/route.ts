import { NextResponse } from "next/server";
import { listPredictions, getTopics } from "@/lib/db";
import { getCuratedSuggestions } from "@/lib/suggestions";
import { llmStatus } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const { topics, seeded } = getTopics();
  const existingClaims = listPredictions().map((p) => p.claim);
  const suggestions = getCuratedSuggestions({
    topics,
    existingClaims,
    today: new Date(),
    limit: 6,
  });
  return NextResponse.json({ topics, seeded, suggestions, llm: llmStatus() });
}
