"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Approve or reject a receipt that is waiting for review.
 *
 * The endpoint existed without any caller, so a paid student's uploaded receipt
 * stayed in `pending_approval` forever. Rejection keeps the enrolment row so
 * the student can upload a replacement.
 */
export function ReceiptReview({ enrollmentId, studentName }: { enrollmentId: string; studentName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"enrolled" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReject, setConfirmingReject] = useState(false);

  async function review(status: "enrolled" | "rejected") {
    setBusy(status);
    setError(null);
    try {
      const res = await fetch(`/api/short-courses/enrollments/${enrollmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not update this receipt.");
        return;
      }
      setConfirmingReject(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <span role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </span>
      )}
      {confirmingReject ? (
        <>
          <span className="text-xs text-ink-muted">Reject {studentName}’s receipt?</span>
          <Button size="sm" variant="danger" onClick={() => review("rejected")} disabled={busy !== null}>
            {busy === "rejected" ? "Rejecting…" : "Reject"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setConfirmingReject(false)} disabled={busy !== null}>
            Cancel
          </Button>
        </>
      ) : (
        <>
          <Button size="sm" onClick={() => review("enrolled")} disabled={busy !== null}>
            {busy === "enrolled" ? "Approving…" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmingReject(true)}
            disabled={busy !== null}
            aria-label={`Reject ${studentName}'s receipt`}
          >
            Reject
          </Button>
        </>
      )}
    </div>
  );
}
