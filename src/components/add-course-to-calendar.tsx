"use client";

import { Calendar } from "lucide-react";

export function AddCourseToCalendar({ title, provider, startDate, duration }: { title: string; provider: string; startDate: string; duration: string }) {
  function download() {
    const start = new Date(startDate);
    if (Number.isNaN(start.getTime())) return;
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const escape = (value: string) => value.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
    const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StudyAbroad Portal//EN", "BEGIN:VEVENT", `UID:${crypto.randomUUID()}@studyabroad`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${escape(title)}`, `DESCRIPTION:${escape(`${provider} · ${duration}`)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const url = URL.createObjectURL(new Blob([content], { type: "text/calendar;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${title.replace(/[^a-z0-9]+/gi, "-") || "course"}.ics`; anchor.click();
    URL.revokeObjectURL(url);
  }

  return <button type="button" onClick={download} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"><Calendar className="h-3 w-3" /> Add to Calendar</button>;
}
