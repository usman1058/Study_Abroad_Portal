"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VisitorLeadForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    courseOfInterest: "",
    countryOfInterest: "",
    notes: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, string> = { source: "dashboard" };
      for (const [k, v] of Object.entries(form)) {
        const trimmed = v.trim();
        if (trimmed) payload[k] = trimmed;
      }
      const res = await fetch("/api/visitor-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to save lead");
        return;
      }
      setForm({ name: "", phone: "", email: "", courseOfInterest: "", countryOfInterest: "", notes: "" });
      setOpen(false);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <div className="space-y-2"><Button onClick={() => setOpen(true)}>+ Add visitor</Button>{saved && <p role="status" className="text-sm text-emerald-700">Visitor lead saved.</p>}</div>;

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-5 dark:border-navy-700 dark:bg-navy-900">
      <h3 className="font-semibold">Capture a visitor / enquiry</h3>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="lead-name">Name</Label><Input id="lead-name" autoComplete="name" required maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label htmlFor="lead-phone">Phone</Label><Input id="lead-phone" autoComplete="tel" type="tel" required maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div><Label htmlFor="lead-email">Email</Label><Input id="lead-email" autoComplete="email" type="email" maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div><Label htmlFor="lead-course">Course of interest</Label><Input id="lead-course" maxLength={120} value={form.courseOfInterest} onChange={(e) => set("courseOfInterest", e.target.value)} /></div>
        <div><Label htmlFor="lead-country">Country of interest</Label><Input id="lead-country" maxLength={120} value={form.countryOfInterest} onChange={(e) => set("countryOfInterest", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label htmlFor="lead-notes">Notes</Label><Textarea id="lead-notes" rows={2} maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save lead"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
