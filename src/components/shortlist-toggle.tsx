"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function ShortlistToggle({ programId, initial = false }: { programId: string; initial?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  useEffect(() => setOn(initial), [initial]);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/shortlist", {
        method: on ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "Failed to update shortlist");
        return;
      }
      setOn(!on);
      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
        on
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200"
          : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
      )}
    >
      <Star className={cn("h-3.5 w-3.5", on && "fill-current")} />
      {on ? "Shortlisted" : "Add to shortlist"}
    </button>
  );
}