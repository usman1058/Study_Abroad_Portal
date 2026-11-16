"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

/**
 * Reorder and remove controls for one shortlist row.
 *
 * The shortlist is the student's own ranking, so position is meaningful. Both
 * actions call `/api/shortlist` and then refresh the server component so the
 * rendered order always matches the database.
 */
export function ShortlistRowActions({
  programId,
  label,
  index,
  count,
}: {
  programId: string;
  label: string;
  index: number;
  count: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"up" | "down" | "remove" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mutate(method: "PATCH" | "DELETE", body: Record<string, unknown>, action: "up" | "down" | "remove") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/shortlist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not update your shortlist.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-xs text-ink-muted">Remove “{label}”?</span>
        <button
          type="button"
          onClick={() => mutate("DELETE", { programId }, "remove")}
          disabled={busy !== null}
          className="inline-flex h-8 items-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {busy === "remove" ? "Removing…" : "Remove"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy !== null}
          className="inline-flex h-8 items-center rounded-lg border border-line-strong px-3 text-xs font-medium hover:bg-canvas dark:border-navy-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {error && (
        <span role="alert" className="mr-1 text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={() => mutate("PATCH", { programId, direction: "up" }, "up")}
        disabled={index === 0 || busy !== null}
        aria-label={`Move ${label} up`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas-subtle hover:text-navy-900 disabled:opacity-40 dark:hover:bg-navy-800"
      >
        <ArrowUp className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => mutate("PATCH", { programId, direction: "down" }, "down")}
        disabled={index === count - 1 || busy !== null}
        aria-label={`Move ${label} down`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas-subtle hover:text-navy-900 disabled:opacity-40 dark:hover:bg-navy-800"
      >
        <ArrowDown className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={busy !== null}
        aria-label={`Remove ${label} from your shortlist`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
