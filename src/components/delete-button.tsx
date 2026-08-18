"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  endpoint,
  confirmText = "Delete?",
  label = "Delete",
}: {
  endpoint: string;
  confirmText?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? "Failed");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30" onClick={run} disabled={busy}>
      {label}
    </Button>
  );
}