"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Option = { id: string; label: string };

export function ApplicationCreateForm({
  students,
  programs,
}: {
  students: Option[];
  programs: Option[];
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
      <div>
        <Label htmlFor="application-student">Student</Label>
        <Select id="application-student" required value={studentId} onChange={(event) => setStudentId(event.target.value)}>
          {students.map((student) => <option key={student.id} value={student.id}>{student.label}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="application-program">Program</Label>
        <Select id="application-program" required value={programId} onChange={(event) => setProgramId(event.target.value)}>
          {programs.map((program) => <option key={program.id} value={program.id}>{program.label}</option>)}
        </Select>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-ink-muted dark:text-slate-300">
          <input type="checkbox" checked={submitNow} onChange={(event) => setSubmitNow(event.target.checked)} />
          Submit now
        </label>
        <Button type="submit" size="sm" disabled={busy || !studentId || !programId}>{busy ? "Creating…" : "Add application"}</Button>
      </div>
      {message && <p className="text-xs text-ink-muted dark:text-slate-300 sm:col-span-3">{message}</p>}
    </form>
  );
}