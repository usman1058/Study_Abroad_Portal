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
        alert(json.error ?? "Failed to save lead");
        return;
      }
      setForm({ name: "", phone: "", email: "", courseOfInterest: "", countryOfInterest: "", notes: "" });
      setOpen(false);
      router.refresh();
    } catch {
      alert("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>+ Add visitor</Button>;

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">Capture a visitor / enquiry</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Name</Label><Input required maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label>Phone</Label><Input required maxLength={30} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div><Label>Email</Label><Input type="email" maxLength={254} value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div><Label>Course of interest</Label><Input maxLength={120} value={form.courseOfInterest} onChange={(e) => set("courseOfInterest", e.target.value)} /></div>
        <div><Label>Country of interest</Label><Input maxLength={120} value={form.countryOfInterest} onChange={(e) => set("countryOfInterest", e.target.value)} /></div>
        <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} maxLength={1000} value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save lead"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}