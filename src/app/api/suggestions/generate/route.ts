import { NextResponse } from "next/server";
import { getTopics } from "@/lib/db";
import { generateSuggestions, resolveLlm } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { config, reason } = resolveLlm();
  if (!config) {
    // Dormant — tell the UI why, don't error.
    return NextResponse.json({ enabled: false, reason }, { status: 200 });
  }
  try {
    const { topics } = getTopics();
    const suggestions = await generateSuggestions(topics, 6);
    if (suggestions.length === 0) {
      return NextResponse.json(
        { enabled: true, suggestions: [], error: "The model didn't return usable suggestions — try again." },
        { status: 200 },
      );
    }
    return NextResponse.json({ enabled: true, suggestions });
  } catch (e) {
    return NextResponse.json(
      { enabled: true, suggestions: [], error: e instanceof Error ? e.message : "Generation failed" },
      { status: 200 },
    );
  }
}
