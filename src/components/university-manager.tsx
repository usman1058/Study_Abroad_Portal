"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UniversityRow = { id: string; name: string; country: string; city: string | null; website: string | null; _count: { programs: number } };

export function UniversityManager({ universities, countries }: { universities: UniversityRow[]; countries: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", country: countries[0] ?? "", city: "", website: "", logoUrl: "" });
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/universities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error ?? "Could not add university."); return; }
      setForm({ name: "", country: countries[0] ?? "", city: "", website: "", logoUrl: "" }); setOpen(false); setMessage("University added."); router.refresh();
    } catch { setMessage("Network error. Please retry."); } finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-ink-muted">Manage the university catalog first, then select a university when you add each program.</p><button onClick={() => setOpen((value) => !value)} className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">{open ? "Close form" : "+ Add university"}</button></div>
    {open && <form onSubmit={submit} className="grid gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-2 dark:border-navy-700 dark:bg-navy-900">
      <label className="text-sm font-medium">University name<input required minLength={2} maxLength={160} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>
      <label className="text-sm font-medium">Country<select required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900"><option value="" disabled>Select destination</option>{countries.map((country) => <option key={country} value={country}>{country}</option>)}</select>{countries.length === 0 && <span className="mt-1 block text-xs text-amber-700">Configure working countries in Settings before adding a university.</span>}</label>
      <label className="text-sm font-medium">City (optional)<input maxLength={120} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>
      <label className="text-sm font-medium">Website (optional)<input type="url" maxLength={300} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://…" className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>
      <label className="text-sm font-medium sm:col-span-2">Logo URL (optional)<input type="url" maxLength={500} value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://…" className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>
      <div className="sm:col-span-2"><button disabled={busy || countries.length === 0} className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save university"}</button></div>
    </form>}
    {message && <p role="status" className="text-sm text-ink-muted">{message}</p>}
    {universities.length === 0 ? <div className="rounded-xl border border-dashed border-line-strong p-10 text-center text-sm text-ink-muted">No universities have been added yet. Add a destination country in Settings, then add your first university.</div> : <div className="overflow-x-auto rounded-xl border border-line dark:border-navy-700"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-canvas-subtle text-xs uppercase tracking-wide text-ink-muted dark:bg-navy-800"><tr><th className="px-4 py-3">University</th><th className="px-4 py-3">Country</th><th className="px-4 py-3">City</th><th className="px-4 py-3">Programs</th><th className="px-4 py-3">Website</th></tr></thead><tbody className="divide-y divide-line dark:divide-navy-700">{universities.map((university) => <tr key={university.id}><td className="px-4 py-3 font-semibold">{university.name}</td><td className="px-4 py-3">{university.country}</td><td className="px-4 py-3">{university.city || "—"}</td><td className="px-4 py-3">{university._count.programs}</td><td className="px-4 py-3">{university.website ? <a className="text-brand-700 underline dark:text-brand-300" href={university.website} target="_blank" rel="noreferrer">Visit site</a> : "—"}</td></tr>)}</tbody></table></div>}
  </div>;
}
