"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { INVITE_SECTIONS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

type SectionAccess = Record<string, "view" | "edit">;

export function InviteLinkForm({ students }: { students: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [days, setDays] = useState(7);
  const [access, setAccess] = useState<SectionAccess>({ applications: "view" });

  function toggleSection(key: string) {
    setAccess((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = "view";
      }
      return next;
    });
  }

  function setMode(key: string, mode: "view" | "edit") {
    setAccess((prev) => ({ ...prev, [key]: mode }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const sections = Object.keys(access);
    if (sections.length === 0) {
      setError("Select at least one section.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          sections,
          access,
          expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to create invite link");
        return;
      }
      const link = `${window.location.origin}/invite/${json.data.token}`;
      setResult(link);
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="space-y-3">
        <Button variant="outline" onClick={() => setOpen(true)}>+ Generate guest invite link</Button>
        {result && (
          <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/30">
            <p className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">Share this link:</p>
            <code className="break-all text-xs">{result}</code>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold">Guest invite link</h3>
      <p className="text-sm text-slate-500">
        Grants section-level view/edit access without creating an account. Expires automatically and can be revoked instantly.
      </p>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Student (data scope)</Label>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Expires in (days)</Label>
          <Input type="number" min={1} max={90} value={days} onChange={(e) => { const n = Number(e.target.value); setDays(Number.isFinite(n) ? Math.min(90, Math.max(1, n)) : 7); }} />
        </div>
      </div>
      <div>
        <Label>Sections & access</Label>
        <div className="space-y-2">
          {INVITE_SECTIONS.map((s) => {
            const active = Boolean(access[s.key]);
            return (
              <div key={s.key} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                <label className="flex flex-1 items-center gap-2 text-sm">
                  <input type="checkbox" checked={active} onChange={() => toggleSection(s.key)} />
                  {s.label}
                </label>
                {active && (
                  <div className="flex gap-1">
                    <Badge tone={access[s.key] === "view" ? "slate" : "green"} className="cursor-pointer" onClick={() => setMode(s.key, "view")}>
                      View
                    </Badge>
                    <Badge tone={access[s.key] === "edit" ? "green" : "slate"} className="cursor-pointer" onClick={() => setMode(s.key, "edit")}>
                      Edit
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Generating…" : "Generate link"}</Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
      {result && (
        <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/30">
          <p className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">Share this link:</p>
          <code className="break-all text-xs">{result}</code>
        </div>
      )}
    </form>
  );
}