"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/generated/prisma/client";
import { roleOptionLabel } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function InviteLinkForm({ roles }: { roles: Role[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; emailStatus: "sent" | "logged"; fallbackPassword?: string } | null>(null);
  const [form, setForm] = useState({
    email: "",
    role: roles[0] ?? "STUDENT" as Role,
    firstName: "",
    lastName: "",
    days: 7,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          firstName: form.firstName,
          lastName: form.lastName,
          expiresAt: new Date(Date.now() + form.days * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Could not create this account invitation.");
        return;
      }
      setResult({ url: `${window.location.origin}${json.data.url}`, emailStatus: json.data.emailStatus, fallbackPassword: json.data.fallbackPassword });
      setForm((current) => ({ ...current, email: "", firstName: "", lastName: "" }));
      setOpen(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <Button variant="outline" onClick={() => { setError(null); setOpen(true); }}>+ Invite a new account</Button>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-white p-5 dark:border-navy-700 dark:bg-navy-900">
          <div>
            <h3 className="font-semibold">Invite someone to CheckMyUni</h3>
            <p className="mt-1 text-sm text-ink-muted">Use an email address that does not already have an account. We’ll create the account and email its temporary sign-in details.</p>
          </div>
          {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="invite-email">Email address</Label>
              <Input id="invite-email" type="email" autoComplete="email" required maxLength={254} value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="invite-role">Account role</Label>
              <Select id="invite-role" value={form.role} onChange={(e) => setForm((current) => ({ ...current, role: e.target.value as Role }))}>
                {roles.map((role) => <option key={role} value={role}>{roleOptionLabel(role)}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="invite-first-name">First name</Label>
              <Input id="invite-first-name" autoComplete="given-name" required maxLength={80} value={form.firstName} onChange={(e) => setForm((current) => ({ ...current, firstName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="invite-last-name">Last name</Label>
              <Input id="invite-last-name" autoComplete="family-name" required maxLength={80} value={form.lastName} onChange={(e) => setForm((current) => ({ ...current, lastName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="invite-days">Invitation link expires in</Label>
              <Select id="invite-days" value={String(form.days)} onChange={(e) => setForm((current) => ({ ...current, days: Number(e.target.value) }))}>
                <option value="1">1 day</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || roles.length === 0}>{busy ? "Sending invitation…" : "Create account and send invite"}</Button>
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setError(null); }}>Cancel</Button>
          </div>
        </form>
      )}
      {result && (
        <div role="status" className={`rounded-lg p-3 text-sm ${result.emailStatus === "sent" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" : "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"}`}>
          <p className="font-semibold">{result.emailStatus === "sent" ? "Invitation email sent." : "Account created, but email delivery could not be confirmed."}</p>
          {result.fallbackPassword && <p className="mt-1">Temporary password (share securely): <code className="select-all font-semibold">{result.fallbackPassword}</code></p>}
          <p className="mt-1">Invitation page:</p>
          <code className="break-all text-xs">{result.url}</code>
        </div>
      )}
    </div>
  );
}
