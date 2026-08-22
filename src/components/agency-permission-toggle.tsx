"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function AgencyPermissionToggle({
  receiverId,
  canViewCommission,
}: {
  receiverId: string;
  canViewCommission: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch("/api/agency-permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, canViewCommission: !canViewCommission }),
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? "Failed");
      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={toggle} disabled={busy} title="Toggle commission visibility for this sub-agency">
      <Badge tone={canViewCommission ? "green" : "slate"} className="cursor-pointer">
        {canViewCommission ? "Can view commission" : "Cannot view commission"}
      </Badge>
    </button>
  );
}