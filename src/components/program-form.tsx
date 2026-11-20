"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/searchable-select";
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
    universityLogoUrl?: string;
  };
};

export function ProgramForm({ universities, initial }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // With no university to choose from, the only workable path is the inline
  // "new university" fields; starting there avoids a submit that cannot pass.
  const [newUniversity, setNewUniversity] = useState(universities.length === 0);
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
    universityLogoUrl: initial?.universityLogoUrl ?? "",
  });

  function set<K extends keyof typeof form>(k: K, v: string | boolean) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  // Several forms can be open at once (the page header plus one per row), so
  // control ids must be unique per program or labels would attach to the wrong
  // input. The header form and a program needing first-time edits share the
  // "new" prefix deliberately: only one of them is open at a time.
  const fieldId = (suffix: string) => `program-${initial?.id ?? "new"}-${suffix}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const num = parseFloat(form.tuitionFee);
      if (!form.tuitionFee || Number.isNaN(num) || num < 0 || num > 1_000_000_000) {
        setError("Enter a valid tuition fee.");
        return;
      }
      const rate = parseFloat(form.commissionRate || "0");
      if (Number.isNaN(rate) || rate < 0 || rate > 100) {
        setError("Commission rate must be between 0 and 100.");
        return;
      }
      const intField = (v: string, lo: number, hi: number, label: string): string | null => {
        if (!v) return null;
        const n = parseInt(v, 10);
        if (Number.isNaN(n) || n < lo || n > hi) return label;
        return null;
      };
      const intError =
        intField(form.offerTurnaroundDays, 0, 365, "Offer turnaround must be 0-365 days") ??
        intField(form.courseDurationMonths, 0, 240, "Course duration must be 0-240 months");
      if (intError) {
        setError(intError + ".");
        return;
      }
      // Parse dates before serialising: `new Date("garbage").toISOString()`
      // throws a RangeError, which the catch would report as a network error.
      const parsedIntakes = form.intakeDates
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((d) => new Date(d));
      if (parsedIntakes.some((d) => Number.isNaN(d.getTime()))) {
        setError("One or more intake dates are invalid. Use YYYY-MM-DD.");
        return;
      }
      const payload = {
        ...form,
        tuitionFee: parseFloat(form.tuitionFee || "0"),
        applicationFee: form.applicationFee ? parseFloat(form.applicationFee) : null,
        minGpa: form.minGpa ? parseFloat(form.minGpa) : null,
        commissionRate: parseFloat(form.commissionRate || "0"),
        offerTurnaroundDays: form.offerTurnaroundDays ? parseInt(form.offerTurnaroundDays) : null,
        courseDurationMonths: form.courseDurationMonths ? parseInt(form.courseDurationMonths) : null,
        intakeDates: parsedIntakes.map((d) => d.toISOString()),
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
      setSaved(initial?.id ? "Program updated." : "Program created.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            setOpen(true);
            setSaved(null);
            setError(null);
          }}
          aria-label={initial?.id ? `Edit ${initial.name ?? "program"}` : "Add a new program"}
        >
          {initial?.id ? "Edit" : "+ Add program"}
        </Button>
        {saved && (
          <span role="status" className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
            {saved}
          </span>
        )}
      </span>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-5 dark:border-navy-700 dark:bg-navy-900">
      <div className="flex items-center justify-between"><h3 className="font-semibold">{initial?.id ? "Edit program" : "Add a new program"}</h3><button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xl leading-none text-ink-muted hover:bg-canvas-subtle dark:hover:bg-navy-800" aria-label="Close program form">×</button></div>
      {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={newUniversity ? fieldId("university-name") : fieldId("university")}>University</Label>
          {newUniversity ? (
            <div className="space-y-2">
              <Input id={fieldId("university-name")} placeholder="New university name" value={form.newUniversityName} onChange={(e) => set("newUniversityName", e.target.value)} />
              <Label htmlFor={fieldId("university-country")}>Country</Label>
              <Input id={fieldId("university-country")} placeholder="Country" value={form.newUniversityCountry} onChange={(e) => set("newUniversityCountry", e.target.value)} />
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setNewUniversity(false)}>
                Choose existing instead
              </button>
            </div>
          ) : (
            <SearchableSelect
              options={universities.map((u) => ({ id: u.id, label: `${u.name} (${u.country})` }))}
              value={form.universityId}
              onChange={(v) => set("universityId", v)}
              placeholder="Search universities…"
              id={fieldId("university")}
            />
          )}
          {!newUniversity && (
            <button type="button" className="mt-1 text-xs text-brand-600 hover:underline" onClick={() => setNewUniversity(true)}>
              + Add new university
            </button>
          )}
        </div>
        <div>
          <Label htmlFor={fieldId("university-logo")}>University Logo URL</Label>
          <Input
            id={fieldId("university-logo")}
            placeholder="https://example.com/logo.png"
            value={form.universityLogoUrl}
            onChange={(e) => set("universityLogoUrl", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={fieldId("name")}>Program name</Label>
          <Input id={fieldId("name")} required maxLength={200} autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("level")}>Level</Label>
          <Select id={fieldId("level")} value={form.level} onChange={(e) => set("level", e.target.value)}>
            {["undergrad", "postgrad", "diploma", "foundation", "english", "other"].map((l) => (
              <option key={l} value={l}>
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={fieldId("field")}>Field</Label>
          <Input id={fieldId("field")} maxLength={120} value={form.field} onChange={(e) => set("field", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("location")}>Location</Label>
          <Input id={fieldId("location")} maxLength={160} value={form.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("tuition-fee")}>Tuition fee (MYR)</Label>
          <Input id={fieldId("tuition-fee")} type="number" step="0.01" required value={form.tuitionFee} onChange={(e) => set("tuitionFee", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("application-fee")}>Application fee (MYR)</Label>
          <Input id={fieldId("application-fee")} type="number" step="0.01" value={form.applicationFee} onChange={(e) => set("applicationFee", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("commission-rate")}>Commission rate (%)</Label>
          <Input id={fieldId("commission-rate")} type="number" step="0.01" value={form.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("min-gpa")}>Min GPA</Label>
          <Input id={fieldId("min-gpa")} type="number" step="0.01" value={form.minGpa} onChange={(e) => set("minGpa", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("offer-turnaround")}>Offer turnaround (days)</Label>
          <Input id={fieldId("offer-turnaround")} type="number" value={form.offerTurnaroundDays} onChange={(e) => set("offerTurnaroundDays", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("duration")}>Course duration (months)</Label>
          <Input id={fieldId("duration")} type="number" value={form.courseDurationMonths} onChange={(e) => set("courseDurationMonths", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("college-rank")}>College rank (QS etc.)</Label>
          <Input id={fieldId("college-rank")} maxLength={160} value={form.collegeRank} onChange={(e) => set("collegeRank", e.target.value)} placeholder="e.g. 251 by QS Rankings" />
        </div>
        <div>
          <Label htmlFor={fieldId("intake-dates")}>Intake dates (comma separated)</Label>
          <Input id={fieldId("intake-dates")} value={form.intakeDates} onChange={(e) => set("intakeDates", e.target.value)} placeholder="2026-09-01, 2027-01-15" />
        </div>
        <div>
          <Label htmlFor={fieldId("tags")}>Tags (comma separated)</Label>
          <Input id={fieldId("tags")} value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="High Placement Rate, MOI Accepted" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={fieldId("required-documents")}>Required documents (comma separated)</Label>
          <Input id={fieldId("required-documents")} value={form.requiredDocuments} onChange={(e) => set("requiredDocuments", e.target.value)} placeholder="Transcript, Passport, IELTS" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={fieldId("eligibility-criteria")}>Eligibility criteria (one per line)</Label>
          <Textarea id={fieldId("eligibility-criteria")} rows={3} value={form.eligibilityCriteria} onChange={(e) => set("eligibilityCriteria", e.target.value)} placeholder={"Minimum IELTS score of 6\nCGPA 3.0 or above"} />
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
