"use client";

import { Calendar } from "lucide-react";

export type CalendarCourseSession = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
};

export function AddCourseToCalendar({
  title,
  provider,
  sessions,
}: {
  title: string;
  provider: string;
  sessions: CalendarCourseSession[];
}) {
  function download() {
    if (sessions.length === 0) return;
    const stamp = (value: string) => new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const escape = (value: string) => value.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
    const events = sessions.map((session) => [
      "BEGIN:VEVENT",
      `UID:${session.id}@studyabroad`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(session.startsAt)}`,
      `DTEND:${stamp(session.endsAt)}`,
      `SUMMARY:${escape(`${title}: ${session.title}`)}`,
      `DESCRIPTION:${escape(`${provider} · ${session.timeZone}`)}`,
      "END:VEVENT",
    ].join("\r\n"));
    const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StudyAbroad Portal//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([`${content}\r\n`], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "course"}-schedule.ics`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={sessions.length === 0}
      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-navy-700 dark:text-brand-300 dark:hover:bg-brand-900/30"
    >
      <Calendar className="h-4 w-4" aria-hidden="true" /> Add all classes to calendar
    </button>
  );
}
