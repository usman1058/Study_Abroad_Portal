"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function VerifyDocument({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(status: "VERIFIED" | "REJECTED") {
    if (status === "REJECTED" && !window.confirm("Reject this document? The student will see the rejection.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason: status === "REJECTED" ? "Rejected by staff" : null }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? "Failed");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-1">
      <Button size="sm" variant="secondary" onClick={() => setStatus("VERIFIED")} disabled={busy}>
        Verify
      </Button>
      <Button size="sm" variant="outline" className="text-red-600" onClick={() => setStatus("REJECTED")} disabled={busy}>
        Reject
      </Button>
    </div>
  );
}