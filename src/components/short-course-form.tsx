"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ProgramPicker } from "@/components/program-picker";
import { Field } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SHORT_COURSE_CATEGORIES } from "@/lib/constants";
import { convertAmount } from "@/lib/constants";
import { humanize } from "@/lib/utils";
import { usePortalCurrency } from "@/components/currency-provider";

type Props = {
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
    linkedProgramLabel?: string;
    paymentType?: "FREE" | "PAID" | "OTHER";
    bankDetails?: string;
    status?: "draft" | "active";
  };
};

export function ShortCourseForm({ initial }: Props) {
  const router = useRouter();
  const { currency } = usePortalCurrency();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feeCurrency, setFeeCurrency] = useState("MYR");
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
    paymentType: initial?.paymentType ?? "FREE",
    bankDetails: initial?.bankDetails ?? "",
    status: initial?.status ?? "draft",
  });

  useEffect(() => {
    if (feeCurrency === currency) return;
    setForm((previous) => {
      const amount = Number(previous.fee);
      return {
        ...previous,
        fee: previous.fee && Number.isFinite(amount)
          ? convertAmount(amount, feeCurrency, currency).toFixed(2)
          : previous.fee,
      };
    });
    setFeeCurrency(currency);
  }, [currency, feeCurrency]);

  useEffect(() => {
    if (open) {
      const frame = window.requestAnimationFrame(() => titleRef.current?.focus());
      wasOpen.current = true;
      return () => window.cancelAnimationFrame(frame);
    }
    if (wasOpen.current) {
      triggerRef.current?.focus();
      wasOpen.current = false;
    }
  }, [open]);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const feeNum = parseFloat(form.fee || "0");
      const feeInMYR = convertAmount(feeNum, feeCurrency, "MYR");
      if (Number.isNaN(feeInMYR) || feeInMYR < 0 || feeInMYR > 10_000_000) {
        setError("Enter a valid course fee.");
        return;
      }
      if (form.meetingLink && !/^https?:\/\//i.test(form.meetingLink.trim())) {
        setError("Meeting link must start with http:// or https://");
        return;
      }
      const rawDates = form.startDates.split(",").map((s) => s.trim()).filter(Boolean);
      const badDate = rawDates.find((d) => Number.isNaN(Date.parse(d)));
      if (badDate) {
        setError(`Invalid start date: "${badDate}". Use YYYY-MM-DD.`);
        return;
      }
      const payload = {
        ...form,
        meetingLink: form.meetingLink.trim() || null,
        classSchedule: form.classSchedule.trim() || null,
        prerequisites: form.prerequisites.trim() || null,
        description: form.description.trim() || null,
        fee: feeInMYR,
        startDates: form.startDates
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((d) => new Date(d).toISOString()),
        linkedProgramId: form.linkedProgramId || null,
        paymentType: form.paymentType,
        bankDetails: form.paymentType === "PAID" ? form.bankDetails.trim() || null : null,
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
      setFeedback(initial?.id ? "Short course changes saved." : form.status === "active" ? "Short course published." : "Short course saved as a draft.");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return <div className="flex flex-wrap items-center gap-3">
    <Button ref={triggerRef} onClick={() => { setError(null); setFeedback(null); setOpen(true); }}>{initial?.id ? "Edit" : "+ Add short course"}</Button>
    {feedback && <p role="status" aria-live="polite" className="text-sm text-emerald-700 dark:text-emerald-300">{feedback}</p>}
  </div>;

  return (
    <form id="short-course-form" aria-labelledby="short-course-form-heading" aria-busy={loading} onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-5 dark:border-navy-700 dark:bg-navy-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="short-course-form-heading" className="font-semibold">{initial?.id ? "Edit short course" : "Create a short course"}</h3>
          <p className="mt-1 text-sm text-ink-muted">Save as a draft while you prepare sessions and materials. Publish when students can enroll.</p>
        </div>
        <button type="button" onClick={() => { setError(null); setOpen(false); }} className="rounded-lg px-2 py-1 text-xl leading-none text-ink-muted hover:bg-canvas-subtle dark:hover:bg-navy-800" aria-label="Close short course form">×</button>
      </div>
      {error && <div role="alert" aria-live="assertive" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title">
          <Input ref={titleRef} required maxLength={200} value={form.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Provider">
          <Input required maxLength={120} value={form.provider} onChange={(e) => set("provider", e.target.value)} />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
            {SHORT_COURSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{humanize(c)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Duration">
          <Input maxLength={80} value={form.duration} onChange={(e) => set("duration", e.target.value)} placeholder="6 weeks" />
        </Field>
        <Field label={`Fee (${feeCurrency})`} hint="Enter this fee in your selected currency. It is converted to MYR for consistent storage and payment records.">
          <Input type="number" min="0" step="0.01" value={form.fee} onChange={(e) => set("fee", e.target.value)} />
        </Field>
        <Field label="Payment Type">
          <Select value={form.paymentType} onChange={(e) => set("paymentType", e.target.value)}>
            <option value="FREE">Free</option>
            <option value="PAID">Paid</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Delivery mode">
          <Select value={form.deliveryMode} onChange={(e) => set("deliveryMode", e.target.value)}>
            <option value="online">Online</option>
            <option value="in-person">In person</option>
            <option value="hybrid">Hybrid</option>
          </Select>
        </Field>
        <Field label="Course visibility">
          <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="draft">Draft — staff only</option>
            <option value="active">Published — students can enroll</option>
          </Select>
        </Field>
        {form.paymentType === "PAID" && (
          <Field label="Payment instructions" className="sm:col-span-2">
            <Textarea rows={3} value={form.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} placeholder="Bank name, account number, SWIFT code, etc." />
          </Field>
        )}
        <Field label="Class schedule overview" hint="Add exact class dates and times on the course page after saving.">
          <Input maxLength={160} value={form.classSchedule} onChange={(e) => set("classSchedule", e.target.value)} placeholder="Optional overview, e.g. weekly evening classes" />
        </Field>
        <Field label="Course meeting link (optional)">
          <Input maxLength={300} value={form.meetingLink} onChange={(e) => set("meetingLink", e.target.value)} placeholder="https://meet.example.com/course" />
        </Field>
        <Field label="Enrollment start dates (comma separated)">
          <Input value={form.startDates} onChange={(e) => set("startDates", e.target.value)} placeholder="2026-10-01, 2027-01-15" />
        </Field>
        <Field label="Linked program (optional)">
          <ProgramPicker
            value={form.linkedProgramId}
            onChange={(v) => set("linkedProgramId", v)}
            emptyLabel="No linked program"
            selectedLabel={initial?.linkedProgramLabel}
          />
          {form.linkedProgramId && (
            <button
              type="button"
              onClick={() => set("linkedProgramId", "")}
              className="mt-2 inline-flex min-h-6 items-center text-xs font-medium text-brand-700 underline dark:text-brand-300"
            >
              Clear linked program
            </button>
          )}
        </Field>
        <Field label="Prerequisites" className="sm:col-span-2">
          <Input maxLength={300} value={form.prerequisites} onChange={(e) => set("prerequisites", e.target.value)} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : form.status === "active" ? "Publish course" : "Save draft"}</Button>
        <Button type="button" variant="outline" onClick={() => { setError(null); setOpen(false); }}>Cancel</Button>
      </div>
    </form>
  );
}
