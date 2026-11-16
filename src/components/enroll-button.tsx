"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ExternalLink, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FeeDisplay } from "@/components/currency";
import { formatDate } from "@/lib/utils";

type CourseInfo = {
  fee: number;
  deliveryMode: string;
  classSchedule: string | null;
  meetingLink: string | null;
  startDates: string[];
  duration: string;
};

const ENROLLED_STATUSES = ["enrolled", "completed"];

/**
 * Enrolment control for the short-course list.
 *
 * The button label always describes what the click will do: "Enrol free",
 * "Enrol and pay", "Complete payment", "Upload a new receipt", or "Withdraw".
 * Previously the enrolled state rendered "Enrolled ✓" but clicking it
 * withdrew the student, and "Interested" silently enrolled them.
 */
export function EnrollButton({
  shortCourseId,
  enrolled,
  status,
  paymentType,
  course,
}: {
  shortCourseId: string;
  enrolled: boolean;
  status?: string;
  paymentType?: "FREE" | "PAID" | "OTHER";
  course?: CourseInfo;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const state = status ?? (enrolled ? "enrolled" : "none");
  const hasAccess = ENROLLED_STATUSES.includes(state);
  const canWithdraw = state !== "none" && state !== "completed";
  const detailsId = `enroll-details-${shortCourseId}`;

  async function enroll() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/short-courses/${shortCourseId}/enroll`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not enrol in this course.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/short-courses/${shortCourseId}/enroll`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Could not withdraw from this course.");
        return;
      }
      setConfirming(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const enrollLabel = paymentType === "PAID" ? "Enrol and pay" : paymentType === "FREE" ? "Enrol free" : "Request a place";

  const nextStart = course?.startDates
    ? course.startDates
        .map((d) => new Date(d))
        .filter((d) => d.getTime() > Date.now())
        .sort((a, b) => a.getTime() - b.getTime())[0]
    : null;

  const statusBadge = (() => {
    if (state === "enrolled") return <Badge tone="green">Enrolled</Badge>;
    if (state === "completed") return <Badge tone="green">Completed</Badge>;
    if (state === "pending_payment") return <Badge tone="amber">Payment pending</Badge>;
    if (state === "pending_approval") return <Badge tone="amber">Receipt under review</Badge>;
    if (state === "rejected") return <Badge tone="red">Receipt rejected</Badge>;
    if (state === "interested") return <Badge tone="slate">Interested</Badge>;
    return null;
  })();

  const nextStep = (() => {
    if (state === "pending_payment") {
      return (
        <Link
          href={`/short-courses/${shortCourseId}`}
          className="inline-flex min-h-8 items-center text-xs font-medium text-brand-700 underline dark:text-brand-300"
        >
          Pay and upload your receipt
        </Link>
      );
    }
    if (state === "pending_approval") {
      return <span className="text-xs text-ink-muted">An administrator is reviewing your receipt.</span>;
    }
    if (state === "rejected") {
      return (
        <Link
          href={`/short-courses/${shortCourseId}`}
          className="inline-flex min-h-8 items-center text-xs font-medium text-red-700 underline dark:text-red-300"
        >
          Receipt rejected — upload a new one
        </Link>
      );
    }
    if (hasAccess) {
      return (
        <Link
          href={`/short-courses/${shortCourseId}`}
          className="inline-flex min-h-8 items-center gap-1 text-xs font-medium text-brand-700 underline dark:text-brand-300"
        >
          View course <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
      );
    }
    return null;
  })();

  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {statusBadge}
        {state === "none" && (
          <Button size="sm" variant="primary" onClick={enroll} disabled={busy}>
            {busy ? "Working…" : enrollLabel}
          </Button>
        )}
        {hasAccess && (
          <Link
            href={`/short-courses/${shortCourseId}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-600 px-3 text-xs font-semibold text-white hover:bg-brand-700"
          >
            Open course <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </Link>
        )}
        {canWithdraw && !confirming && (
          <Button size="sm" variant="outline" onClick={() => setConfirming(true)} disabled={busy}>
            {state === "enrolled" ? "Withdraw" : "Cancel request"}
          </Button>
        )}
        {course && (
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((v) => !v)}
          >
            Details <ChevronDown className={"h-3.5 w-3.5 transition " + (open ? "rotate-180" : "")} aria-hidden="true" />
          </Button>
        )}
      </div>

      {confirming && (
        <div className="w-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-900/30">
          <p className="font-medium">
            {state === "enrolled"
              ? "Withdraw from this course?"
              : "Cancel this enrolment request?"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {state === "enrolled"
              ? "You will lose access to the class link."
              : "Any uploaded receipt and your place will be removed."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={withdraw}
              disabled={busy}
              className="inline-flex h-8 items-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? "Withdrawing…" : "Yes, withdraw"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="inline-flex h-8 items-center rounded-lg border border-line-strong px-3 text-xs font-medium hover:bg-canvas dark:border-navy-700"
            >
              Keep course
            </button>
          </div>
        </div>
      )}

      {nextStep}

      {error && (
        <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {open && course && (
        <div id={detailsId} className="w-full rounded-xl border border-line bg-canvas p-4 text-sm dark:border-navy-700 dark:bg-navy-800/60">
          <p className="mb-2 font-semibold">
            {hasAccess ? "Your course details" : "What you get when you enrol"}
          </p>
          <ul className="space-y-1.5">
            {course.classSchedule && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600" aria-hidden="true">•</span>
                <span><span className="font-medium">Class schedule:</span> {course.classSchedule}</span>
              </li>
            )}
            {course.deliveryMode && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600" aria-hidden="true">•</span>
                <span><span className="font-medium">Delivery:</span> {course.deliveryMode}</span>
              </li>
            )}
            {course.duration && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600" aria-hidden="true">•</span>
                <span><span className="font-medium">Duration:</span> {course.duration}</span>
              </li>
            )}
            {nextStart && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600" aria-hidden="true">•</span>
                <span><span className="font-medium">Next start:</span> {formatDate(nextStart)}</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-brand-600" aria-hidden="true">•</span>
              <span>
                <span className="font-medium">Course fee:</span> <FeeDisplay amount={course.fee} />
                {paymentType === "PAID"
                  ? " — enrol first, then upload your bank-transfer receipt on the course page."
                  : " — no payment is required."}
              </span>
            </li>
            {course.meetingLink ? (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600" aria-hidden="true">•</span>
                <span>
                  <span className="font-medium">Meeting link:</span>{" "}
                  <a href={course.meetingLink} target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center gap-1 text-brand-600 underline">
                    Join class <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </span>
              </li>
            ) : (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600" aria-hidden="true">•</span>
                <span className="inline-flex items-center gap-1">
                  <Video className="h-3 w-3" aria-hidden="true" /> A meeting link will be shared closer to the class start date.
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
