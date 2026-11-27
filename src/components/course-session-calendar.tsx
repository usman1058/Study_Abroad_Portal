"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, ExternalLink, MapPin } from "lucide-react";
import type { ShortCourseSessionInfo } from "@/components/short-course-studio";

function dateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function dateKey(timestamp: string, timeZone: string) {
  const { year, month, day } = dateParts(new Date(timestamp), timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatTime(timestamp: string, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(timestamp));
}

function formatSelectedDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function CourseSessionCalendar({ sessions, canJoin }: { sessions: ShortCourseSessionInfo[]; canJoin: boolean }) {
  const timeZone = sessions[0]?.timeZone || "Asia/Kuala_Lumpur";
  const initial = sessions[0] ? dateParts(new Date(sessions[0].startsAt), timeZone) : dateParts(new Date(), timeZone);
  const [view, setView] = useState(monthKey(initial.year, initial.month));
  const [selected, setSelected] = useState(sessions[0] ? dateKey(sessions[0].startsAt, timeZone) : "");
  const [year, month] = view.split("-").map(Number);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, ShortCourseSessionInfo[]>();
    for (const session of sessions) {
      const key = dateKey(session.startsAt, session.timeZone || timeZone);
      map.set(key, [...(map.get(key) ?? []), session]);
    }
    return map;
  }, [sessions, timeZone]);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const selectedSessions = selected ? sessionsByDate.get(selected) ?? [] : [];

  function moveMonth(delta: number) {
    const next = new Date(Date.UTC(year, month - 1 + delta, 1));
    setView(monthKey(next.getUTCFullYear(), next.getUTCMonth() + 1));
  }

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,.85fr)]">
    <section aria-label="Course class calendar" className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/60 p-4 shadow-sm dark:border-indigo-900/60 dark:from-navy-900 dark:via-indigo-950/20 dark:to-violet-950/30 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 dark:from-indigo-900/60 dark:to-violet-900/50 dark:text-indigo-200"><CalendarDays className="h-5 w-5" aria-hidden="true" /></span><div><h2 className="text-lg font-extrabold">Class calendar</h2><p className="text-xs text-ink-muted">Dates shown in {timeZone}</p></div></div>
        <div className="flex items-center gap-2"><button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-800 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-indigo-900 dark:bg-navy-900 dark:text-indigo-200"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><p aria-live="polite" className="min-w-32 text-center font-bold">{new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1, 12)))}</p><button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-800 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-indigo-900 dark:bg-navy-900 dark:text-indigo-200"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div>
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Class dates by month">
        {(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const).map((day) => <div key={day} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wide text-ink-muted sm:text-xs">{day}</div>)}
        {cells.map((day, index) => {
          if (!day) return <div aria-hidden="true" key={`blank-${index}`} className="min-h-12 sm:min-h-16" />;
          const key = `${view}-${String(day).padStart(2, "0")}`;
          const items = sessionsByDate.get(key) ?? [];
          const active = selected === key;
          return <button key={key} type="button" aria-pressed={active} aria-label={`${formatSelectedDate(key)}${items.length ? `, ${items.length} class${items.length === 1 ? "" : "es"}` : ", no classes"}`} onClick={() => setSelected(key)} className={`relative flex min-h-12 flex-col items-center justify-center rounded-xl border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 sm:min-h-16 ${active ? "border-indigo-500 bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md" : items.length ? "border-indigo-200 bg-white text-indigo-900 hover:border-violet-300 hover:bg-violet-50 dark:border-indigo-800 dark:bg-navy-900 dark:text-indigo-100 dark:hover:bg-indigo-950/50" : "border-transparent bg-white/60 text-ink-muted hover:border-line hover:bg-white dark:bg-navy-900/40 dark:hover:bg-navy-900"}`}><span>{day}</span>{items.length > 0 && <span aria-hidden="true" className={`mt-1 h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-violet-500"}`} />}</button>;
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-ink-muted">Select a marked date to see the class time, meeting details, and any available join link.</p>
    </section>

    <section aria-live="polite" aria-label="Selected class date" className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-indigo-50/70 p-5 shadow-sm dark:border-violet-900/60 dark:from-violet-950/30 dark:via-navy-900 dark:to-indigo-950/30 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-[.15em] text-violet-700 dark:text-violet-300">Selected day</p>
      <h2 className="mt-2 text-xl font-extrabold">{selected ? formatSelectedDate(selected) : "Choose a date"}</h2>
      {selectedSessions.length ? <ol className="mt-4 space-y-3">{selectedSessions.map((session) => <li key={session.id} className="rounded-2xl border border-violet-100 bg-white/90 p-4 dark:border-violet-900/50 dark:bg-navy-900/80"><h3 className="font-bold">{session.title}</h3><p className="mt-2 flex items-center gap-2 text-sm text-ink-muted"><Clock3 className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />{formatTime(session.startsAt, session.timeZone)} – {formatTime(session.endsAt, session.timeZone)}</p><p className="mt-1 flex items-center gap-2 text-xs text-ink-muted"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{session.timeZone}</p>{canJoin && session.meetingLink && <a href={session.meetingLink} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white">Join class <ExternalLink className="h-4 w-4" aria-hidden="true" /></a>}{canJoin && !session.meetingLink && <p className="mt-3 text-xs font-medium text-ink-muted">Meeting link not posted yet.</p>}{!canJoin && <p className="mt-3 text-xs font-medium text-amber-800 dark:text-amber-200">The meeting link unlocks after enrollment approval.</p>}</li>)}</ol> : <div className="mt-4 rounded-2xl border border-dashed border-violet-200 bg-white/60 px-4 py-8 text-center dark:border-violet-900/60 dark:bg-navy-900/50"><CalendarDays className="mx-auto h-7 w-7 text-violet-500" aria-hidden="true" /><p className="mt-2 font-semibold">No class scheduled for this day</p><p className="mt-1 text-sm text-ink-muted">Marked dates in the calendar contain course sessions.</p></div>}
    </section>
  </div>;
}
