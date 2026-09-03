"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CourseFilter } from "@/components/course-filter";

export function ApplyForm({ programs }: { programs: { id: string; label: string; country?: string; level?: string; field?: string; fee?: number }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(programId: string) {
    if (!programId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to start application");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <CourseFilter
        programs={programs}
        onSelect={(programId) => submit(programId)}
      />
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}