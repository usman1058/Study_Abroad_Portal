"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  universities: { id: string; name: string; country: string }[];
  initial?: {
    id?: string;
    universityId?: string;
    name?: string;
    level?: string;
    field?: string;
    location?: string;
    tuitionFee?: string;
    applicationFee?: string;
    intakeDates?: string[];
    requiredDocuments?: string[];
    minGpa?: number | null;
    visaRequired?: boolean;
    commissionRate?: string;
    tags?: string[];
    offerTurnaroundDays?: number | null;
    collegeRank?: string;
    eligibilityCriteria?: string[];
    courseDurationMonths?: number | null;
  };
};

export function ProgramForm({ universities, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newUniversity, setNewUniversity] = useState(false);
  const [form, setForm] = useState({
    universityId: initial?.universityId ?? universities[0]?.id ?? "",
    newUniversityName: "",
    newUniversityCountry: "",
    name: initial?.name ?? "",
    level: initial?.level ?? "undergrad",
    field: initial?.field ?? "",
    location: initial?.location ?? "",
    tuitionFee: initial?.tuitionFee ?? "",
    applicationFee: initial?.applicationFee ?? "",
    intakeDates: initial?.intakeDates?.join(", ") ?? "",
    requiredDocuments: initial?.requiredDocuments?.join(", ") ?? "",
    minGpa: initial?.minGpa != null ? String(initial.minGpa) : "",
    visaRequired: initial?.visaRequired ?? false,
    commissionRate: initial?.commissionRate ?? "",
    tags: initial?.tags?.join(", ") ?? "",
    offerTurnaroundDays: initial?.offerTurnaroundDays != null ? String(initial.offerTurnaroundDays) : "",
    collegeRank: initial?.collegeRank ?? "",
    eligibilityCriteria: initial?.eligibilityCriteria?.join("\n") ?? "",
    courseDurationMonths: initial?.courseDurationMonths != null ? String(initial.courseDurationMonths) : "",
  });

  function set<K extends keyof typeof form>(k: K, v: string | boolean) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        tuitionFee: parseFloat(form.tuitionFee || "0"),
        applicationFee: form.applicationFee ? parseFloat(form.applicationFee) : null,
        minGpa: form.minGpa ? parseFloat(form.minGpa) : null,
        commissionRate: parseFloat(form.commissionRate || "0"),
        offerTurnaroundDays: form.offerTurnaroundDays ? parseInt(form.offerTurnaroundDays) : null,
        courseDurationMonths: form.courseDurationMonths ? parseInt(form.courseDurationMonths) : null,
        intakeDates: form.intakeDates
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((d) => new Date(d).toISOString()),
        requiredDocuments: form.requiredDocuments
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tags: form.tags
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        eligibilityCriteria: form.eligibilityCriteria
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        newUniversity,
      };
      const res = await fetch(initial?.id ? `/api/scholarships/${initial.id}` : "/api/scholarships", {
        method: initial?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save program");
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

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>{initial?.id ? "Edit" : "+ Add program"}</Button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">{initial?.id ? "Edit program" : "Add a new program"}</h3>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>University</Label>
          {newUniversity ? (
            <div className="space-y-2">
              <Input placeholder="New university name" value={form.newUniversityName} onChange={(e) => set("newUniversityName", e.target.value)} />
              <Input placeholder="Country" value={form.newUniversityCountry} onChange={(e) => set("newUniversityCountry", e.target.value)} />
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setNewUniversity(false)}>
                Choose existing instead
              </button>
            </div>
          ) : (
            <Select value={form.universityId} onChange={(e) => set("universityId", e.target.value)}>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.country})
                </option>
              ))}
            </Select>
          )}
          {!newUniversity && (
            <button type="button" className="mt-1 text-xs text-brand-600 hover:underline" onClick={() => setNewUniversity(true)}>
              + Add new university
            </button>
          )}
        </div>
        <div>
          <Label>Program name</Label>
          <Input required value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label>Level</Label>
          <Select value={form.level} onChange={(e) => set("level", e.target.value)}>
            {["undergrad", "postgrad", "diploma", "foundation", "english", "other"].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Field</Label>
          <Input value={form.field} onChange={(e) => set("field", e.target.value)} />
        </div>
        <div>
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div>
          <Label>Tuition fee (MYR)</Label>
          <Input type="number" step="0.01" required value={form.tuitionFee} onChange={(e) => set("tuitionFee", e.target.value)} />
        </div>
        <div>
          <Label>Application fee (MYR)</Label>
          <Input type="number" step="0.01" value={form.applicationFee} onChange={(e) => set("applicationFee", e.target.value)} />
        </div>
        <div>
          <Label>Commission rate (%)</Label>
          <Input type="number" step="0.01" value={form.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} />
        </div>
        <div>
          <Label>Min GPA</Label>
          <Input type="number" step="0.01" value={form.minGpa} onChange={(e) => set("minGpa", e.target.value)} />
        </div>
        <div>
          <Label>Offer turnaround (days)</Label>
          <Input type="number" value={form.offerTurnaroundDays} onChange={(e) => set("offerTurnaroundDays", e.target.value)} />
        </div>
        <div>
          <Label>Course duration (months)</Label>
          <Input type="number" value={form.courseDurationMonths} onChange={(e) => set("courseDurationMonths", e.target.value)} />
        </div>
        <div>
          <Label>College rank (QS etc.)</Label>
          <Input value={form.collegeRank} onChange={(e) => set("collegeRank", e.target.value)} placeholder="e.g. 251 by QS Rankings" />
        </div>
        <div>
          <Label>Intake dates (comma separated)</Label>
          <Input value={form.intakeDates} onChange={(e) => set("intakeDates", e.target.value)} placeholder="2026-09-01, 2027-01-15" />
        </div>
        <div>
          <Label>Tags (comma separated)</Label>
          <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="High Placement Rate, MOI Accepted" />
        </div>
        <div className="sm:col-span-2">
          <Label>Required documents (comma separated)</Label>
          <Input value={form.requiredDocuments} onChange={(e) => set("requiredDocuments", e.target.value)} placeholder="Transcript, Passport, IELTS" />
        </div>
        <div className="sm:col-span-2">
          <Label>Eligibility criteria (one per line)</Label>
          <Textarea rows={3} value={form.eligibilityCriteria} onChange={(e) => set("eligibilityCriteria", e.target.value)} placeholder={"Minimum IELTS score of 6\nCGPA 3.0 or above"} />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={form.visaRequired} onChange={(e) => set("visaRequired", e.target.checked)} />
          Visa required (adds Visa stage to applications)
        </label>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save program"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}