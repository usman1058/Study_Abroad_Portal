"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, ShieldCheck } from "lucide-react";

export function ShortCourseEnrollmentSubmit({ courseId, paid }: { courseId: string; paid: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/short-courses/${encodeURIComponent(courseId)}/enroll`, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "We could not submit your enrollment. Please try again.");
        return;
      }
      router.push(`/short-courses/${encodeURIComponent(courseId)}/enroll/confirmation`);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-3">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
    <button type="button" onClick={submit} disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70 sm:w-auto">
      {busy ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending request…</> : <><ShieldCheck className="h-4 w-4" aria-hidden="true" /> {paid ? "Confirm details and continue" : "Submit enrollment request"}</>}
    </button>
  </div>;
}
