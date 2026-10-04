"use client";

import { useState } from "react";
import { Pencil, Percent } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CommissionRateEditor({ programId, programName, initialRate }: { programId: string; programName: string; initialRate: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rate, setRate] = useState(String(initialRate));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(rate);
    if (!Number.isFinite(value) || value < 0 || value > 100) { setError("Commission rate must be between 0 and 100."); return; }
    setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/scholarships/${programId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commissionRate: value }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error ?? "Could not save the commission rate."); return; }
      setOpen(false);
      router.refresh();
    } catch { setError("Network error. Please try again."); } finally { setSaving(false); }
  }

  return <><Button size="sm" variant="outline" onClick={() => { setRate(String(initialRate)); setError(null); setOpen(true); }} aria-label={`Edit commission for ${programName}`}><Pencil className="h-3.5 w-3.5" /> Edit</Button><Dialog open={open} onClose={() => setOpen(false)} title="Set partner commission"><form onSubmit={save} className="space-y-5"><div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60"><p className="text-xs font-medium uppercase tracking-wide text-slate-500">Program</p><p className="mt-1 font-semibold">{programName}</p></div>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</p>}<div><Label htmlFor={`commission-${programId}`}>Commission rate (%)</Label><div className="relative mt-1"><Percent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id={`commission-${programId}`} type="number" min="0" max="100" step="0.01" value={rate} onChange={(event) => setRate(event.target.value)} className="pl-9" required /></div><p className="mt-2 text-xs text-slate-500">Enter the percentage paid to eligible partners for this program.</p></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save rate"}</Button></div></form></Dialog></>;
}
