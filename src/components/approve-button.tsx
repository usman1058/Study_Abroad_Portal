"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ApproveButton({ userId, email, disabled = false }: { userId: string; email: string; disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error ?? "Could not approve this account."); return; }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <span className="inline-flex flex-wrap items-center gap-1">{confirming ? <><span role="alert" className="text-xs">Approve {email}?</span><Button variant="primary" size="sm" onClick={run} disabled={busy}>{busy ? "Approving…" : "Confirm"}</Button><Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button></> : <Button variant="outline" size="sm" onClick={() => setConfirming(true)} disabled={busy || disabled} title={disabled ? "Verify the partner’s registration and supporting documents first." : undefined}>{disabled ? "Verify documents first" : "Approve"}</Button>}{error && <span role="alert" className="text-xs text-red-700">{error}</span>}</span>;
}
