"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Field, Label } from "@/components/ui/label";
import { ProgramPicker } from "@/components/program-picker";
import { SearchableSelect } from "@/components/searchable-select";

type Option = { id: string; label: string };

type Feedback = { tone: "success" | "error"; text: string };

export function ApplicationCreateForm({ students }: { students: Option[] }) {
  const router = useRouter();
  // Deliberately starts empty: pre-selecting the first student meant "Add
  // application" could silently file the wrong one.
  const [studentId, setStudentId] = useState("");
  const [programId, setProgramId] = useState("");
  const [submitNow, setSubmitNow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function createApplication(event: React.FormEvent) {
    event.preventDefault();
    if (!studentId || !programId) {
      setFeedback({ tone: "error", text: "Choose both a student and a program first." });
      return;
    }
    setBusy(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, programId, submit: submitNow }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setFeedback({ tone: "error", text: payload.error ?? "Could not create the application." });
        return;
      }
      setFeedback({
        tone: "success",
        text: submitNow ? "Application created and submitted." : "Draft application created.",
      });
      // Reset so the next entry does not silently reuse the last selection.
      setStudentId("");
      setProgramId("");
      setSubmitNow(false);
      router.refresh();
    } catch {
      setFeedback({ tone: "error", text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      id="new-application"
      onSubmit={createApplication}
      noValidate
      aria-labelledby="new-application-heading"
      className="scroll-mt-24 space-y-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-900/40 dark:bg-brand-950/20"
    >
      <div>
        <h2 id="new-application-heading" className="text-sm font-semibold text-navy-900 dark:text-slate-200">
          Add application
        </h2>
        <p className="text-xs text-ink-muted">
          Pick a student and a program. A draft is created unless you tick “Submit now”.
        </p>
      </div>

      {students.length === 0 ? (
        <p className="rounded-lg bg-white px-3 py-2 text-sm text-ink-muted dark:bg-navy-900">
          No students are assigned to you yet, so there is nobody to apply for. A manager can assign students
          from <span className="font-medium text-ink dark:text-slate-200">Users</span>.
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="new-application-student">Student</Label>
              <SearchableSelect
                id="new-application-student"
                ariaLabel="Student"
                options={students}
                value={studentId}
                onChange={setStudentId}
                placeholder="Search students…"
                allLabel="Choose a student"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-navy-900 dark:text-slate-300">Program</span>
              <ProgramPicker
                value={programId}
                onChange={setProgramId}
                emptyLabel="Search and select a program…"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Field label="Submit now" hint="Leave unticked to keep the application as a draft.">
              <input
                type="checkbox"
                checked={submitNow}
                onChange={(event) => setSubmitNow(event.target.checked)}
                className="h-4 w-4 rounded border-line-strong text-brand-600 focus:ring-2 focus:ring-brand-500/30 dark:border-navy-600"
              />
            </Field>
            <Button type="submit" disabled={busy || !studentId || !programId}>
              {busy ? <Spinner size={14} className="mr-1" /> : <Plus aria-hidden className="mr-1 h-4 w-4" />}
              {busy ? "Creating…" : "Add application"}
            </Button>
          </div>
        </>
      )}

      {feedback && (
        <p
          role={feedback.tone === "error" ? "alert" : "status"}
          className={
            "rounded-lg px-3 py-2 text-sm " +
            (feedback.tone === "error"
              ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-200"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200")
          }
        >
          {feedback.text}
        </p>
      )}
    </form>
  );
}
