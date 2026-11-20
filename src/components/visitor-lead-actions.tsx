"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { humanize } from "@/lib/utils";

export function VisitorLeadActions({ id, status, controlId = `lead-status-${id}` }: { id: string; status: string; controlId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function change(next: string) {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/visitor-form/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(payload.error ?? "Could not update this lead."); return; }
      router.refresh();
    } catch { setError("Network error. Please try again."); }
    finally { setBusy(false); }
  }
  const statuses = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"];
  return <div className="space-y-1"><label htmlFor={controlId} className="sr-only">Status for lead</label><Select id={controlId} value={status} disabled={busy} onChange={(event) => change(event.target.value)} className="h-8 min-w-32 text-xs">{statuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</Select>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</div>;
}
