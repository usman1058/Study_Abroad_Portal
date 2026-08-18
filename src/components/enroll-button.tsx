"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export function EnrollButton({
  shortCourseId,
  enrolled,
  status,
  course,
}: {
  shortCourseId: string;
  enrolled: boolean;
  status?: string;
  course?: {
    fee: number;
    deliveryMode: string;
    classSchedule: string | null;
    meetingLink: string | null;
    startDates: string[];
    duration: string;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch(`/api/short-courses/${shortCourseId}/enroll`, {
        method: enrolled ? "DELETE" : "POST",
      });
      const json = await res.json();
      if (!res.ok) alert(json.error ?? "Failed");
      setOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!enrolled) {
    return (
      <Button size="sm" variant="primary" onClick={toggle} disabled={busy}>
        {busy ? "Working…" : "Enroll / express interest"}
      </Button>
    );
  }

  const nextStart = course?.startDates
    ? course.startDates
        .map((d) => new Date(d))
        .filter((d) => d.getTime() > Date.now())
        .sort((a, b) => a.getTime() - b.getTime())[0]
    : null;

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={status === "enrolled" ? "outline" : "primary"} onClick={toggle} disabled={busy}>
          {status === "enrolled" ? "Enrolled ✓" : "Interested ✓"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          Details {open ? "▲" : "▼"}
        </Button>
      </div>
      {open && (
        <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60">
          <p className="mb-2 font-semibold">After enrolling you will get:</p>
          <ul className="space-y-1.5">
            {course?.classSchedule && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600">•</span>
                <span><span className="font-medium">Class schedule:</span> {course.classSchedule}</span>
              </li>
            )}
            {course?.deliveryMode && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600">•</span>
                <span><span className="font-medium">Delivery:</span> {course.deliveryMode}</span>
              </li>
            )}
            {course?.duration && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600">•</span>
                <span><span className="font-medium">Duration:</span> {course.duration}</span>
              </li>
            )}
            {nextStart && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600">•</span>
                <span><span className="font-medium">Next start:</span> {formatDate(nextStart)}</span>
              </li>
            )}
            {course?.fee != null && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600">•</span>
                <span><span className="font-medium">Course fee:</span> MYR {course.fee.toLocaleString()} — payment details will be sent to you separately.</span>
              </li>
            )}
            {course?.meetingLink ? (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600">•</span>
                <span>
                  <span className="font-medium">Meeting link:</span>{" "}
                  <a href={course.meetingLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                    Join class <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </li>
            ) : (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-600">•</span>
                <span className="inline-flex items-center gap-1">
                  <Video className="h-3 w-3" /> A meeting link will be shared closer to the class start date.
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}