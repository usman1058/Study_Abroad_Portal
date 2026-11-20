"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProgramPicker } from "@/components/program-picker";
import { X } from "lucide-react";

export function ShortlistBuilder({
  studentId,
  current,
}: {
  studentId: string;
  current: { programId: string; label: string }[];
}) {
  const router = useRouter();
  const [programId, setProgramId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  async function add() {
    if (!programId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, programId }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to add this course."); return; }
      setProgramId("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/shortlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, programId: id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to remove this course."); return; }
      setConfirmRemove(null);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {current.length === 0 ? (
        <p className="text-sm text-ink-muted">No courses on this student's shortlist.</p>
      ) : (
        <ul className="space-y-2">
          {current.map((c) => (
            <li key={c.programId} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm dark:border-navy-700">
              <span className="min-w-0 truncate">{c.label}</span>
              {confirmRemove === c.programId ? <div className="flex items-center gap-1"><span className="text-xs">Remove?</span><Button size="sm" variant="danger" onClick={() => remove(c.programId)} disabled={busy}>Yes</Button><Button size="sm" variant="outline" onClick={() => setConfirmRemove(null)} disabled={busy}>Cancel</Button></div> : <button type="button" aria-label={`Remove ${c.label} from shortlist`} onClick={() => setConfirmRemove(c.programId)} disabled={busy} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-slate-600 hover:text-red-600"><X className="h-4 w-4" /></button>}
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
          <div className="min-w-0 flex-1"><ProgramPicker value={programId} onChange={setProgramId} emptyLabel="Search programs to add…" /></div>
          <Button size="sm" onClick={add} disabled={busy || !programId || current.some((c) => c.programId === programId)}>Add</Button>
        </div>
    </div>
  );
}
