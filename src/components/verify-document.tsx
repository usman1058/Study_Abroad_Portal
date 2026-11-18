"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VerifyDocument({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function updateStatus(nextStatus: "VERIFIED" | "REJECTED", rejectionReason?: string) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason: rejectionReason ?? null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "The document could not be updated.");
        return;
      }
      setRejecting(false);
      setReason("");
      setStatus(nextStatus === "VERIFIED" ? "Document verified." : "Document rejected. The student can now see your reason.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="secondary" onClick={() => updateStatus("VERIFIED")} disabled={busy}>
          Verify
        </Button>
        <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setRejecting(true); setError(null); }} disabled={busy}>
          Reject
        </Button>
      </div>
      {rejecting && <div className="space-y-2 rounded-lg border border-line p-2 dark:border-navy-700">
        <label htmlFor={`document-reason-${documentId}`} className="block text-xs font-medium">Reason shown to the student</label>
        <textarea id={`document-reason-${documentId}`} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} required rows={2} className="w-full rounded-lg border border-line-strong bg-white p-2 text-sm dark:border-navy-700 dark:bg-navy-900" />
        <div className="flex gap-2">
          <Button size="sm" variant="danger" onClick={() => updateStatus("REJECTED", reason.trim())} disabled={busy || !reason.trim()}>{busy ? "Saving…" : "Confirm rejection"}</Button>
          <Button size="sm" variant="outline" onClick={() => { setRejecting(false); setReason(""); }}>Cancel</Button>
        </div>
      </div>}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      {status && <p role="status" className="text-xs text-emerald-700">{status}</p>}
    </div>
  );
}
