"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { X } from "lucide-react";

export function ShortlistBuilder({
  studentId,
  current,
  catalog,
}: {
  studentId: string;
  current: { programId: string; label: string }[];
  catalog: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [programId, setProgramId] = useState("");
  const [busy, setBusy] = useState(false);

  const available = catalog.filter((p) => !current.some((c) => c.programId === p.id));

  async function add() {
    if (!programId) return;
    setBusy(true);
    try {
      const res = await fetch("/api/shortlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, programId }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? "Failed to add");
      setProgramId("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/shortlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, programId: id }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? "Failed to remove");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {current.length === 0 ? (
        <p className="text-sm text-slate-500">No courses on this student's shortlist.</p>
      ) : (
        <ul className="space-y-2">
          {current.map((c) => (
            <li key={c.programId} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
              <span className="min-w-0 truncate">{c.label}</span>
              <button onClick={() => remove(c.programId)} disabled={busy} className="text-slate-400 hover:text-red-600">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {available.length > 0 && (
        <div className="flex gap-2">
          <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
            <option value="">Add a course…</option>
            {available.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
          <Button size="sm" onClick={add} disabled={busy || !programId}>Add</Button>
        </div>
      )}
    </div>
  );
}