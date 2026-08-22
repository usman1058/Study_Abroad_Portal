"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SHORT_COURSE_CATEGORIES } from "@/lib/constants";
import { humanize } from "@/lib/utils";

type Props = {
  programs: { id: string; label: string }[];
  initial?: {
    id?: string;
    title?: string;
    provider?: string;
    category?: string;
    duration?: string;
    startDates?: string[];
    fee?: string;
    deliveryMode?: string;
    classSchedule?: string | null;
    meetingLink?: string | null;
    prerequisites?: string | null;
    description?: string | null;
    linkedProgramId?: string | null;
  };
};

export function ShortCourseForm({ programs, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    provider: initial?.provider ?? "",
    category: initial?.category ?? "LANGUAGE",
    duration: initial?.duration ?? "",
    startDates: initial?.startDates?.join(", ") ?? "",
    fee: initial?.fee ?? "",
    deliveryMode: initial?.deliveryMode ?? "online",
    classSchedule: initial?.classSchedule ?? "",
    meetingLink: initial?.meetingLink ?? "",
    prerequisites: initial?.prerequisites ?? "",
    description: initial?.description ?? "",
    linkedProgramId: initial?.linkedProgramId ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        fee: parseFloat(form.fee || "0"),
        startDates: form.startDates
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((d) => new Date(d).toISOString()),
        linkedProgramId: form.linkedProgramId || null,
      };
      const res = await fetch(initial?.id ? `/api/short-courses/${initial.id}` : "/api/short-courses", {
        method: initial?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save short course");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>{initial?.id ? "Edit" : "+ Add short course"}</Button>;

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">{initial?.id ? "Edit short course" : "Add a short course"}</h3>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <Input required value={form.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div>
          <Label>Provider</Label>
          <Input required value={form.provider} onChange={(e) => set("provider", e.target.value)} />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
            {SHORT_COURSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{humanize(c)}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Duration</Label>
          <Input value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="6 weeks" />
        </div>
        <div>
          <Label>Fee (MYR)</Label>
          <Input type="number" step="0.01" value={form.fee} onChange={(e) => set("fee", e.target.value)} />
        </div>
        <div>
          <Label>Delivery mode</Label>
          <Select value={form.deliveryMode} onChange={(e) => set("deliveryMode", e.target.value)}>
            <option value="online">Online</option>
            <option value="in-person">In person</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </div>
        <div>
          <Label>Class schedule</Label>
          <Input value={form.classSchedule} onChange={(e) => set("classSchedule", e.target.value)} placeholder="Mon/Wed 7:00 PM–9:00 PM (MYT)" />
        </div>
        <div>
          <Label>Meeting link</Label>
          <Input value={form.meetingLink} onChange={(e) => set("meetingLink", e.target.value)} placeholder="https://meet.example.com/course" />
        </div>
        <div>
          <Label>Start dates (comma separated)</Label>
          <Input value={form.startDates} onChange={(e) => set("startDates", e.target.value)} placeholder="2026-10-01, 2027-01-15" />
        </div>
        <div>
          <Label>Linked program (optional)</Label>
          <Select value={form.linkedProgramId} onChange={(e) => set("linkedProgramId", e.target.value)}>
            <option value="">None</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Prerequisites</Label>
          <Input value={form.prerequisites} onChange={(e) => set("prerequisites", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save course"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}