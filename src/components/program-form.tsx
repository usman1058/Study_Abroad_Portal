"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/searchable-select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PROGRAM_LEVELS, programLevelLabel } from "@/lib/constants";
import { convertAmount } from "@/lib/constants";
import { usePortalCurrency } from "@/components/currency-provider";

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

export function ProgramForm({ universities, initial, startOpen = false, standalone = false }: Props & { startOpen?: boolean; standalone?: boolean }) {
  const router = useRouter();
  const { currency } = usePortalCurrency();
  const [open, setOpen] = useState(startOpen);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [feeCurrency, setFeeCurrency] = useState("MYR");
  const [form, setForm] = useState({
    universityId: initial?.universityId ?? universities[0]?.id ?? "",
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

  useEffect(() => {
    if (feeCurrency === currency) return;
    setForm((previous) => {
      const convertField = (value: string) => {
        const amount = Number(value);
        return value && Number.isFinite(amount) ? convertAmount(amount, feeCurrency, currency).toFixed(2) : value;
      };
      return { ...previous, tuitionFee: convertField(previous.tuitionFee), applicationFee: convertField(previous.applicationFee) };
    });
    setFeeCurrency(currency);
  }, [currency, feeCurrency]);

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
      const num = convertAmount(parseFloat(form.tuitionFee), feeCurrency, "MYR");
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
        tuitionFee: num,
        applicationFee: form.applicationFee ? convertAmount(parseFloat(form.applicationFee), feeCurrency, "MYR") : null,
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
      };

      const res = await fetch(initial?.id ? `/api/programs/${initial.id}` : "/api/programs", {
        method: initial?.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save program");
        return;
      }
      if (standalone && !initial?.id) {
        router.push(`/programs/${json.data.id}`);
      } else {
        setOpen(false);
        setSaved(initial?.id ? "Program updated." : "Program created.");
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open && !standalone) {
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
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-line bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-900 sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Program catalog</p><h2 className="mt-1 text-xl font-bold">{initial?.id ? "Edit program" : "Program information"}</h2><p className="mt-1 text-sm text-ink-muted">Add the course, fees, and admission information students need to compare options.</p></div>{!standalone && <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xl leading-none text-ink-muted hover:bg-canvas-subtle dark:hover:bg-navy-800" aria-label="Close program form">×</button>}</div>
      {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

      <fieldset className="rounded-xl border border-line p-4 dark:border-navy-700 sm:p-5"><legend className="px-2 text-base font-semibold">University and program</legend><div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={fieldId("university")}>University</Label>
          {universities.length ? (
            <SearchableSelect
              options={universities.map((u) => ({ id: u.id, label: `${u.name} (${u.country})` }))}
              value={form.universityId}
              onChange={(v) => set("universityId", v)}
              placeholder="Search universities…"
              id={fieldId("university")}
              required
            />
          ) : <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">Add a university in the <Link href="/universities" className="font-semibold underline">Universities section</Link> before creating a program.</p>}
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
            {PROGRAM_LEVELS.map((l) => (
              <option key={l} value={l}>
                {programLevelLabel(l)}
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
      </div></fieldset>

      <fieldset className="rounded-xl border border-line p-4 dark:border-navy-700 sm:p-5"><legend className="px-2 text-base font-semibold">Fees and partnership</legend><div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={fieldId("tuition-fee")}>Tuition fee ({feeCurrency})</Label>
          <Input id={fieldId("tuition-fee")} type="number" min="0" step="0.01" required value={form.tuitionFee} onChange={(e) => set("tuitionFee", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("application-fee")}>Application fee ({feeCurrency})</Label>
          <Input id={fieldId("application-fee")} type="number" min="0" step="0.01" value={form.applicationFee} onChange={(e) => set("applicationFee", e.target.value)} />
        </div>
        <div>
          <Label htmlFor={fieldId("commission-rate")}>Commission rate (%)</Label>
          <Input id={fieldId("commission-rate")} type="number" min="0" max="100" step="0.01" value={form.commissionRate} onChange={(e) => set("commissionRate", e.target.value)} />
        </div>
      </div></fieldset>

      <fieldset className="rounded-xl border border-line p-4 dark:border-navy-700 sm:p-5"><legend className="px-2 text-base font-semibold">Admissions and requirements</legend><div className="grid gap-4 sm:grid-cols-2">
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
      </div></fieldset>
      <div className="flex gap-2">
        <Button type="submit" disabled={loading || universities.length === 0}>
          {loading ? "Saving…" : "Save program"}
        </Button>
        {standalone ? <Link href="/programs" className="inline-flex min-h-10 items-center rounded-lg border border-line-strong px-4 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:hover:bg-navy-800">Cancel</Link> : <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>}
      </div>
    </form>
  );
}
