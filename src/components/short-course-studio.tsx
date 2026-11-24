"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Download, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { localDateTimeInZoneToDate } from "@/lib/time-zones";
import { formatInTimeZone } from "@/lib/time-zones";
import { useUploadLimit } from "@/hooks/use-upload-limit";
import { formatUploadSizeMB } from "@/lib/upload-limits";
import { canConvertImageToWebP, prepareUploadFile } from "@/lib/upload-image";

const COMMON_TIME_ZONES = [
  "Asia/Kuala_Lumpur",
  "Asia/Karachi",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

export type ShortCourseSessionInfo = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  timeZone: string;
  meetingLink: string | null;
};

export type ShortCourseMaterialInfo = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  contentType: string;
  fileSize: number;
  published: boolean;
  createdAt: string;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ShortCourseStudio({
  courseId,
  sessions,
  materials,
}: {
  courseId: string;
  sessions: ShortCourseSessionInfo[];
  materials: ShortCourseMaterialInfo[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [session, setSession] = useState({ title: "", startsAt: "", endsAt: "", timeZone: "Asia/Kuala_Lumpur", meetingLink: "" });
  const [material, setMaterial] = useState({ title: "", description: "", published: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const { maxUploadSizeMB, maxUploadSizeBytes } = useUploadLimit();
  const [feedback, setFeedback] = useState<string | null>(null);

  async function addSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const start = localDateTimeInZoneToDate(session.startsAt, session.timeZone.trim());
      const end = localDateTimeInZoneToDate(session.endsAt, session.timeZone.trim());
      if (!start || !end) {
        setError("Check the date, time, and time zone. This local time may not exist because of a clock change.");
        return;
      }
      if (end <= start) {
        setError("The end time must be later than the start time.");
        return;
      }
      const response = await fetch(`/api/short-courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: session.title,
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          timeZone: session.timeZone.trim(),
          meetingLink: session.meetingLink.trim() || null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "The class session could not be saved.");
        return;
      }
      setSession((current) => ({ ...current, title: "", startsAt: "", endsAt: "", meetingLink: "" }));
      setFeedback("Class session added.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function addMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a study material file first.");
      return;
    }
    if (file.size > maxUploadSizeBytes && !canConvertImageToWebP(file)) {
      setError(`Choose a file no larger than ${formatUploadSizeMB(maxUploadSizeMB)}. PDF and Word files cannot be automatically compressed.`);
      return;
    }
    setBusy(true);
    setError(null);
    setUploadNotice(null);
    setFeedback(null);
    try {
      const prepared = await prepareUploadFile(file, maxUploadSizeBytes);
      if (prepared.file.size > maxUploadSizeBytes) {
        setError(`Choose a file no larger than ${formatUploadSizeMB(maxUploadSizeMB)}.`);
        return;
      }
      if (prepared.convertedToWebP) setUploadNotice(`Image optimized to WebP (${formatUploadSizeMB(prepared.file.size / (1024 * 1024))}).`);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(prepared.file);
      });
      const response = await fetch(`/api/short-courses/${courseId}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: material.title, description: material.description, fileName: prepared.file.name, base64, published: material.published }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "The study material could not be uploaded.");
        return;
      }
      setMaterial({ title: "", description: "", published: true });
      if (fileRef.current) fileRef.current.value = "";
      setFeedback(`${prepared.convertedToWebP ? "Image optimized as WebP. " : ""}${material.published ? "Study material uploaded and published for enrolled students." : "Study material uploaded as a draft."}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare the selected file.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(endpoint: string, label: string) {
    if (!window.confirm(`Remove ${label}?`)) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? `Could not remove ${label}.`);
        return;
      }
      setFeedback(`${label} removed.`);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="course-studio-heading" className="space-y-5">
      <div>
        <h2 id="course-studio-heading" className="text-xl font-bold">Course classroom setup</h2>
        <p className="mt-1 text-sm text-ink-muted">Schedule live classes and publish study files. Published materials are available to enrolled students.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</p>}
      {uploadNotice && <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{uploadNotice}</p>}
      {feedback && <p role="status" aria-live="polite" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">{feedback}</p>}

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-line bg-white p-5 dark:border-navy-700 dark:bg-navy-900">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h3 className="font-semibold">Class schedule</h3>
          </div>
          <form onSubmit={addSession} aria-busy={busy} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label htmlFor="session-title">Class or lesson title</Label><Input id="session-title" required maxLength={120} value={session.title} onChange={(e) => setSession({ ...session, title: e.target.value })} placeholder="Week 1: Course introduction" /></div>
            <div><Label htmlFor="session-start">Starts</Label><Input id="session-start" required type="datetime-local" value={session.startsAt} onChange={(e) => setSession({ ...session, startsAt: e.target.value })} /></div>
            <div><Label htmlFor="session-end">Ends</Label><Input id="session-end" required type="datetime-local" value={session.endsAt} onChange={(e) => setSession({ ...session, endsAt: e.target.value })} /></div>
            <div><Label htmlFor="session-zone">Class time zone</Label><Input id="session-zone" required maxLength={80} list="short-course-time-zones" value={session.timeZone} onChange={(e) => setSession({ ...session, timeZone: e.target.value })} placeholder="Asia/Kuala_Lumpur" /><datalist id="short-course-time-zones">{COMMON_TIME_ZONES.map((zone) => <option key={zone} value={zone} />)}</datalist></div>
            <div><Label htmlFor="session-link">Meeting link (optional)</Label><Input id="session-link" type="url" maxLength={300} value={session.meetingLink} onChange={(e) => setSession({ ...session, meetingLink: e.target.value })} placeholder="https://meet.example.com/..." /></div>
            <p className="sm:col-span-2 text-xs text-ink-muted">Enter the wall-clock time shown in the selected time zone. Enrolled students will see the join link.</p>
            <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Adding session…" : "Add class session"}</Button></div>
          </form>
          <div className="divide-y divide-line dark:divide-navy-700">
            {sessions.length === 0 ? <p className="py-4 text-sm text-ink-muted">No class sessions yet.</p> : sessions.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-ink-muted">{formatInTimeZone(item.startsAt, item.timeZone)} – {formatInTimeZone(item.endsAt, item.timeZone)} ({item.timeZone})</p>
                </div>
                <button type="button" disabled={busy} onClick={() => remove(`/api/short-courses/${courseId}/sessions/${item.id}`, `class session “${item.title}”`)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-900/30" aria-label={`Remove ${item.title}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-line bg-white p-5 dark:border-navy-700 dark:bg-navy-900">
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-brand-600" aria-hidden="true" />
            <h3 className="font-semibold">Study materials</h3>
          </div>
          <form onSubmit={addMaterial} aria-busy={busy} className="space-y-3">
            <div><Label htmlFor="material-title">Material title</Label><Input id="material-title" required maxLength={160} value={material.title} onChange={(e) => setMaterial({ ...material, title: e.target.value })} placeholder="Week 1 lecture notes" /></div>
            <div><Label htmlFor="material-description">Description (optional)</Label><Textarea id="material-description" rows={2} maxLength={1000} value={material.description} onChange={(e) => setMaterial({ ...material, description: e.target.value })} /></div>
            <div><Label htmlFor="material-file">File (PDF, JPEG, PNG, WebP, DOC, DOCX)</Label><Input ref={fileRef} id="material-file" required type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-describedby="material-file-size-help" onChange={(event) => {
              const selected = event.target.files?.[0];
              setUploadNotice(null);
              setError(selected && selected.size > maxUploadSizeBytes && !canConvertImageToWebP(selected)
                ? `Choose a file no larger than ${formatUploadSizeMB(maxUploadSizeMB)}. PDF and Word files cannot be automatically compressed.`
                : null);
              if (selected && selected.size > maxUploadSizeBytes && canConvertImageToWebP(selected)) {
                setUploadNotice(`This image will be resized/compressed to WebP before upload (maximum ${formatUploadSizeMB(maxUploadSizeMB)}).`);
              }
            }} /><p id="material-file-size-help" className="text-xs text-ink-muted">Maximum file size: {formatUploadSizeMB(maxUploadSizeMB)}. JPG/PNG images are optimized to WebP.</p></div>
            <label className="flex min-h-9 items-center gap-2 text-sm"><input type="checkbox" checked={material.published} onChange={(e) => setMaterial({ ...material, published: e.target.checked })} /> Publish now so enrolled students can access it</label>
            <Button type="submit" disabled={busy}>{busy ? "Uploading material…" : "Upload material"}</Button>
          </form>
          <div className="divide-y divide-line dark:divide-navy-700">
            {materials.length === 0 ? <p className="py-4 text-sm text-ink-muted">No study materials uploaded yet.</p> : materials.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="flex min-w-0 items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-ink-muted">{item.fileName} · {formatBytes(item.fileSize)} · {item.published ? "Published" : "Draft"}</p>
                    {item.description && <p className="mt-1 text-sm text-ink-muted">{item.description}</p>}
                    <a href={`/api/short-courses/${courseId}/materials/${item.id}`} aria-label={`Download ${item.title}`} className="mt-1 inline-flex min-h-8 items-center gap-1 text-sm font-medium text-brand-700 underline dark:text-brand-300"><Download className="h-3.5 w-3.5" aria-hidden="true" /> Download</a>
                  </div>
                </div>
                <button type="button" disabled={busy} onClick={() => remove(`/api/short-courses/${courseId}/materials/${item.id}`, `study material “${item.title}”`)} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-900/30" aria-label={`Remove ${item.title}`}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
