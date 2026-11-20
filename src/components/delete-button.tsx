"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DeleteButton({
  endpoint,
  itemName,
  confirmText,
  label = "Delete",
}: {
  endpoint: string;
  /** Named so a list of 24 rows does not expose 24 identical "Delete" buttons. */
  itemName?: string;
  confirmText?: string;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const target = itemName ? `“${itemName}”` : "this item";
  const question = confirmText ?? `Delete ${target}? This cannot be undone.`;

  async function run() {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback(json.error ?? "The item could not be deleted.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setFeedback("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1">
      {confirming ? <>
        <span role="alert" className="max-w-48 text-xs text-red-700 dark:text-red-300">{question}</span>
        <Button
          variant="danger"
          size="sm"
          onClick={run}
          disabled={busy}
          aria-label={itemName ? `Confirm deleting ${itemName}` : "Confirm delete"}
        >
          {busy ? "Deleting…" : "Confirm"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setConfirming(false); setFeedback(null); }}
          disabled={busy}
          aria-label={itemName ? `Cancel deleting ${itemName}` : "Cancel delete"}
        >
          Cancel
        </Button>
      </> : (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
          onClick={() => setConfirming(true)}
          disabled={busy}
          aria-label={itemName ? `Delete ${itemName}` : undefined}
        >
          {label}
        </Button>
      )}
      {feedback && <span role="alert" className="text-xs text-red-700 dark:text-red-300">{feedback}</span>}
    </span>
  );
}
