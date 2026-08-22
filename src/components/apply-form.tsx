"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function ApplyForm({ programs }: { programs: { id: string; label: string }[] }) {
  const router = useRouter();
  const [programId, setProgramId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 flex-1">
        <Label>Start a new application</Label>
        <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
          <option value="">Select a program…</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={busy || !programId}>Apply</Button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}