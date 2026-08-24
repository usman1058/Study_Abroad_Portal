"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TRANSACTION_TYPES, CURRENCIES } from "@/lib/constants";
import { humanize } from "@/lib/utils";

export function TransactionForm({
  students,
  agencies,
}: {
  students: { id: string; label: string }[];
  agencies: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: "SERVICE_FEE",
    amount: "",
    currency: "MYR",
    relatedStudentId: "",
    relatedAgencyId: "",
    method: "bank_transfer",
    notes: "",
    date: new Date().toISOString().slice(0, 10),
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(form.amount);
    if (!form.amount || Number.isNaN(amt) || amt <= 0) {
      setError("Enter a valid positive amount.");
      return;
    }
    if (amt > 1_000_000_000_000) {
      setError("Amount is too large.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: amt,
          relatedStudentId: form.relatedStudentId || null,
          relatedAgencyId: form.relatedAgencyId || null,
          method: form.method || null,
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to add transaction");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Add transaction</Button>;

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">Add transaction</h3>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Type</Label>
          <Select value={form.type} onChange={(e) => set("type", e.target.value)}>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>{humanize(t)}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Amount</Label>
          <Input type="number" step="0.01" required value={form.amount} onChange={(e) => set("amount", e.target.value)} />
        </div>
        <div>
          <Label>Currency</Label>
          <Select value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Date</Label>
          <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div>
          <Label>Related student</Label>
          <Select value={form.relatedStudentId} onChange={(e) => set("relatedStudentId", e.target.value)}>
            <option value="">None</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Related agency</Label>
          <Select value={form.relatedAgencyId} onChange={(e) => set("relatedAgencyId", e.target.value)}>
            <option value="">None</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Method</Label>
          <Select value={form.method} onChange={(e) => set("method", e.target.value)}>
            <option value="bank_transfer">Bank transfer</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="online">Online payment</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>Notes (what is this payment for?)</Label>
        <Input maxLength={500} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Service fee for Bachelor of Computer Science" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save transaction"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}