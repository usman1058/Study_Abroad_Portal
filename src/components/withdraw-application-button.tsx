"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function WithdrawApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "WITHDRAWN" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "The application could not be withdrawn.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <span className="inline-flex flex-wrap items-center gap-2">
    {confirming ? <>
      <span className="text-xs text-amber-700 dark:text-amber-300">Withdraw this application?</span>
      <Button size="sm" variant="danger" disabled={busy} onClick={withdraw}>{busy ? "Withdrawing…" : "Confirm"}</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button>
    </> : <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>Withdraw</Button>}
    {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
  </span>;
}
