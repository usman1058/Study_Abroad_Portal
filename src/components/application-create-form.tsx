"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ProgramPicker, type ProgramOption } from "@/components/program-picker";
import { SearchableSelect } from "@/components/searchable-select";

type Option = { id: string; label: string };

export function ApplicationCreateForm({
  students,
  programs,
}: {
  students: Option[];
  programs: ProgramOption[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [submitNow, setSubmitNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function createApplication(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, programId, submit: submitNow }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Could not create the application.");
        return;
      }
      setMessage("Application created.");
      router.refresh();
    } catch {
      setMessage("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={createApplication} className="grid gap-3 rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-900/40 dark:bg-brand-950/20 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div className="sm:col-span-2">
        <Label>Student (search to filter)</Label>
        <SearchableSelect options={students} value={studentId} onChange={setStudentId} placeholder="Search students…" />
      </div>
      <div className="sm:col-span-2">
        <Label>Program (advanced filters)</Label>
        <ProgramPicker programs={programs} value={programId} onChange={setProgramId} emptyLabel="Search and select a program…" />
      </div>
      <div className="space-y-2 sm:col-span-2">
        <label className="flex items-center gap-2 text-xs text-ink-muted dark:text-slate-300">
          <input type="checkbox" checked={submitNow} onChange={(event) => setSubmitNow(event.target.checked)} />
          Submit now
        </label>
        <Button type="submit" disabled={busy || !studentId || !programId}>{busy && <Spinner size={14} className="mr-1" />}{busy ? "Creating…" : "Add application"}</Button>
      </div>
      {message && <p className="text-xs text-ink-muted dark:text-slate-300 sm:col-span-3">{message}</p>}
    </form>
  );
}