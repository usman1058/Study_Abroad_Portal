"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VerifyPartnerDocument({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/partner-documents/${documentId}`, { method: "PUT" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "The document could not be verified.");
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
    <div className="space-y-1">
      <Button size="sm" variant="secondary" onClick={verify} disabled={busy}>
        {busy ? "Verifying…" : "Verify"}
      </Button>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
