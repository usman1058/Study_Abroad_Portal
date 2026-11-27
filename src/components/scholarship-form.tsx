"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePortalCurrency } from "@/components/currency-provider";
import { PROGRAM_LEVELS, programLevelLabel } from "@/lib/constants";

type UniversityOption = { id: string; name: string; country: string };
type ProgramOption = { id: string; name: string; level: string; field: string; universityId: string; universityName: string };
type Initial = {
  id: string; name: string; providerName: string | null; description: string; category: string; awardType: string;
  awardValue: string | null; awardCurrency: string; eligibleCountries: string[]; studyLevels: string[]; subject: string | null;
  eligibilityCriteria: string[]; deadline: string | null; applicationUrl: string | null; isActive: boolean;
  universityIds: string[]; programIds: string[];
};

const categories = ["MERIT", "NEED_BASED", "COUNTRY_SPECIFIC", "UNIVERSITY_SPECIFIC", "PROGRAM_SPECIFIC", "OTHER"] as const;
const awardTypes = ["PERCENTAGE", "FIXED_AMOUNT", "FULL_TUITION", "OTHER"] as const;
const currencies = ["MYR", "USD", "GBP", "EUR", "AUD", "CAD", "SGD"];

export function ScholarshipForm({ universities, programs, initial }: { universities: UniversityOption[]; programs: ProgramOption[]; initial?: Initial }) {
  const router = useRouter();
  const { currency } = usePortalCurrency();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [universityQuery, setUniversityQuery] = useState("");
  const [programQuery, setProgramQuery] = useState("");
  const [universityIds, setUniversityIds] = useState(initial?.universityIds ?? []);
  const [programIds, setProgramIds] = useState(initial?.programIds ?? []);
  const [form, setForm] = useState({
    name: initial?.name ?? "", providerName: initial?.providerName ?? "", description: initial?.description ?? "",
    category: initial?.category ?? "MERIT", awardType: initial?.awardType ?? "PERCENTAGE", awardValue: initial?.awardValue ?? "",
    awardCurrency: initial?.awardCurrency ?? currency, eligibleCountries: initial?.eligibleCountries.join(", ") ?? "",
    studyLevels: initial?.studyLevels ?? [], subject: initial?.subject ?? "", eligibilityCriteria: initial?.eligibilityCriteria.join("\n") ?? "",
    deadline: initial?.deadline ? new Date(initial.deadline).toISOString().slice(0, 10) : "", applicationUrl: initial?.applicationUrl ?? "", isActive: initial?.isActive ?? true,
  });
  const visibleUniversities = useMemo(() => universities.filter((item) => `${item.name} ${item.country}`.toLowerCase().includes(universityQuery.toLowerCase())), [universities, universityQuery]);
  const visiblePrograms = useMemo(() => programs.filter((item) => universityIds.includes(item.universityId) && `${item.name} ${item.field} ${item.universityName}`.toLowerCase().includes(programQuery.toLowerCase())), [programs, programQuery, universityIds]);
  function toggleUniversity(id: string) {
    const next = universityIds.includes(id) ? universityIds.filter((item) => item !== id) : [...universityIds, id];
    setUniversityIds(next);
    setProgramIds((current) => current.filter((programId) => programs.some((program) => program.id === programId && next.includes(program.universityId))));
  }
  function toggleProgram(id: string) { setProgramIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const amount = form.awardType === "FULL_TUITION" ? null : form.awardValue.trim() ? Number(form.awardValue) : null;
    if (["PERCENTAGE", "FIXED_AMOUNT"].includes(form.awardType) && amount == null) { setError("Enter the scholarship award value."); setBusy(false); return; }
    if (form.awardType === "PERCENTAGE" && (amount! < 0 || amount! > 100)) { setError("Percentage awards must be between 0 and 100."); setBusy(false); return; }
    if (!universityIds.length && !programIds.length) { setError("Link the scholarship to at least one university or program."); setBusy(false); return; }
    const payload = {
      ...form, awardValue: amount, eligibleCountries: form.eligibleCountries.split(",").map((item) => item.trim()).filter(Boolean),
      eligibilityCriteria: form.eligibilityCriteria.split("\n").map((item) => item.trim()).filter(Boolean),
      deadline: form.deadline ? new Date(`${form.deadline}T23:59:59.000Z`).toISOString() : null,
      applicationUrl: form.applicationUrl.trim() || null, universityIds, programIds,
    };
    try {
      const response = await fetch(initial ? `/api/scholarships/${initial.id}` : "/api/scholarships", { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error ?? "Could not save the scholarship."); return; }
      router.push(`/scholarships/${result.data.slug}`); router.refresh();
    } catch { setError("Network error. Please try again."); } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="space-y-6 rounded-2xl border border-line bg-white p-5 shadow-sm dark:border-navy-700 dark:bg-navy-900 sm:p-7">
    <header><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Scholarship catalogue</p><h2 className="mt-1 text-xl font-bold">{initial ? "Edit scholarship" : "Scholarship information"}</h2><p className="mt-1 text-sm text-ink-muted">Define the award, eligibility, participating universities, and eligible programs.</p></header>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:bg-red-950/40 dark:text-red-200">{error}</p>}

    <fieldset className="rounded-xl border border-line p-4 dark:border-navy-700 sm:p-5"><legend className="px-2 text-base font-semibold">Scholarship overview</legend><div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Scholarship name<Input required minLength={2} maxLength={200} value={form.name} onChange={(event) => set("name", event.target.value)} className="mt-1" /></label>
      <label className="text-sm font-medium">Provider / sponsor (optional)<Input maxLength={160} value={form.providerName} onChange={(event) => set("providerName", event.target.value)} className="mt-1" /></label>
      <label className="text-sm font-medium">Scholarship type<Select value={form.category} onChange={(event) => set("category", event.target.value)} className="mt-1">{categories.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</option>)}</Select></label>
      <label className="text-sm font-medium">Application deadline (optional)<Input type="date" value={form.deadline} onChange={(event) => set("deadline", event.target.value)} className="mt-1" /></label>
      <label className="text-sm font-medium sm:col-span-2">Description<Textarea required minLength={10} maxLength={6000} rows={5} value={form.description} onChange={(event) => set("description", event.target.value)} placeholder="Explain what the award covers, who it supports, and how it is awarded." className="mt-1" /></label>
    </div></fieldset>

    <fieldset className="rounded-xl border border-line p-4 dark:border-navy-700 sm:p-5"><legend className="px-2 text-base font-semibold">Award and eligibility</legend><div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">Award basis<Select value={form.awardType} onChange={(event) => set("awardType", event.target.value)} className="mt-1">{awardTypes.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())}</option>)}</Select></label>
      {form.awardType !== "FULL_TUITION" && <label className="text-sm font-medium">{form.awardType === "PERCENTAGE" ? "Award amount (%)" : "Award value (optional)"}<div className="mt-1 flex gap-2"><Input type="number" min="0" max={form.awardType === "PERCENTAGE" ? 100 : undefined} step="0.01" required={form.awardType === "PERCENTAGE" || form.awardType === "FIXED_AMOUNT"} value={form.awardValue} onChange={(event) => set("awardValue", event.target.value)} />{form.awardType === "FIXED_AMOUNT" && <Select aria-label="Award currency" value={form.awardCurrency} onChange={(event) => set("awardCurrency", event.target.value)} className="w-28 shrink-0">{currencies.map((value) => <option key={value}>{value}</option>)}</Select>}</div></label>}
      <label className="text-sm font-medium sm:col-span-2">Eligible applicant countries (optional)<Input value={form.eligibleCountries} onChange={(event) => set("eligibleCountries", event.target.value)} placeholder="For example: Pakistan, Bangladesh" className="mt-1" /><span className="mt-1 block text-xs font-normal text-ink-muted">These are students’ home countries. Study destinations are determined by the linked universities.</span></label>
      <div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Eligible study levels (optional)</p><div className="flex flex-wrap gap-2">{PROGRAM_LEVELS.map((level) => <label key={level} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm dark:border-navy-700"><input type="checkbox" checked={form.studyLevels.includes(level)} onChange={() => set("studyLevels", form.studyLevels.includes(level) ? form.studyLevels.filter((item) => item !== level) : [...form.studyLevels, level])} />{programLevelLabel(level)}</label>)}</div></div>
      <label className="text-sm font-medium">Subject / field (optional)<Input maxLength={120} value={form.subject} onChange={(event) => set("subject", event.target.value)} className="mt-1" /></label>
      <label className="text-sm font-medium">Application URL (optional)<Input type="url" maxLength={500} value={form.applicationUrl} onChange={(event) => set("applicationUrl", event.target.value)} placeholder="https://…" className="mt-1" /></label>
      <label className="text-sm font-medium sm:col-span-2">Eligibility criteria (one per line)<Textarea rows={4} maxLength={4000} value={form.eligibilityCriteria} onChange={(event) => set("eligibilityCriteria", event.target.value)} placeholder={"Academic results required\nLanguage score\nOther conditions"} className="mt-1" /></label>
    </div></fieldset>

    <fieldset className="rounded-xl border border-line p-4 dark:border-navy-700 sm:p-5"><legend className="px-2 text-base font-semibold">Universities and programs</legend><p className="mb-4 text-sm text-ink-muted">Choose one or more universities. If the scholarship is limited to particular courses, select those programs too.</p><div className="grid gap-5 lg:grid-cols-2">
      <div><label className="text-sm font-medium">Find universities<Input value={universityQuery} onChange={(event) => setUniversityQuery(event.target.value)} placeholder="Search name or country" className="mt-1" /></label><div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-line p-2 dark:border-navy-700">{visibleUniversities.map((university) => <label key={university.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-canvas-subtle dark:hover:bg-navy-800"><input type="checkbox" checked={universityIds.includes(university.id)} onChange={() => toggleUniversity(university.id)} /><span className="font-medium">{university.name}</span><span className="ml-auto text-xs text-ink-muted">{university.country}</span></label>)}{visibleUniversities.length === 0 && <p className="p-3 text-sm text-ink-muted">No universities match.</p>}</div></div>
      <div><label className="text-sm font-medium">Find programs<Input value={programQuery} onChange={(event) => setProgramQuery(event.target.value)} placeholder={universityIds.length ? "Search selected universities’ programs" : "Select a university first"} disabled={!universityIds.length} className="mt-1" /></label><div className="mt-2 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-line p-2 dark:border-navy-700">{visiblePrograms.map((program) => <label key={program.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-canvas-subtle dark:hover:bg-navy-800"><input type="checkbox" checked={programIds.includes(program.id)} onChange={() => toggleProgram(program.id)} /><span className="min-w-0"><span className="block font-medium">{program.name}</span><span className="block text-xs text-ink-muted">{program.universityName} · {programLevelLabel(program.level)}{program.field ? ` · ${program.field}` : ""}</span></span></label>)}{universityIds.length > 0 && visiblePrograms.length === 0 && <p className="p-3 text-sm text-ink-muted">No matching programs. You can leave this empty for university-wide awards.</p>}</div></div>
    </div></fieldset>
    <label className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-4 text-sm font-medium dark:border-navy-700"><input type="checkbox" checked={form.isActive} onChange={(event) => set("isActive", event.target.checked)} />Show this scholarship to students</label>
    <div className="flex flex-wrap gap-3"><button disabled={busy} className="min-h-11 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50">{busy ? "Saving scholarship…" : initial ? "Save changes" : "Create scholarship"}</button><Link href="/scholarships" className="inline-flex min-h-11 items-center rounded-lg border border-line-strong px-4 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:hover:bg-navy-800">Cancel</Link></div>
  </form>;
}
