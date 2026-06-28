"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResolveForm({ id }: { id: number }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(outcome: 0 | 1) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/predictions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, resolution_notes: notes || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to resolve");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to resolve");
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Resolution notes (optional)"
        className="mb-2 w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Outcome:</span>
        <button
          onClick={() => resolve(1)}
          disabled={busy}
          className="rounded-lg px-3 py-1 text-sm font-medium text-white shadow-sm transition disabled:opacity-50"
          style={{ backgroundColor: "var(--color-yes)" }}
        >
          It happened
        </button>
        <button
          onClick={() => resolve(0)}
          disabled={busy}
          className="rounded-lg px-3 py-1 text-sm font-medium text-white shadow-sm transition disabled:opacity-50"
          style={{ backgroundColor: "var(--color-no)" }}
        >
          It didn&apos;t
        </button>
        {error && <span className="text-sm text-no">{error}</span>}
      </div>
    </div>
  );
}
