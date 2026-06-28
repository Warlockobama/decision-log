"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this prediction permanently?")) return;
    setBusy(true);
    const res = await fetch(`/api/predictions/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setBusy(false);
  }

  return (
    <button
      onClick={onDelete}
      disabled={busy}
      title="Delete"
      className="text-xs text-faint transition-colors hover:text-no disabled:opacity-50"
    >
      Delete
    </button>
  );
}
