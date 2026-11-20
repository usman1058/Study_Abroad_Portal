"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";

export function UserRoleEditor({ userId, role, allowedRoles }: { userId: string; role: Role; allowedRoles: Role[] }) {
  const router = useRouter();
  const [nextRole, setNextRole] = useState(role);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setNextRole(role); setSaved(false); }, [role]);
  async function save() {
    if (nextRole === role || !allowedRoles.includes(nextRole)) return;
    setBusy(true); setError(null); setSaved(false);
    try {
      const response = await fetch(`/api/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: nextRole }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { setError(payload.error ?? "The role could not be changed."); return; }
      setSaved(true); router.refresh();
    } catch { setError("Network error. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap items-center gap-1"><label htmlFor={`user-role-${userId}`} className="sr-only">Role for this account</label><Select id={`user-role-${userId}`} value={nextRole} onChange={(event) => { setNextRole(event.target.value as Role); setSaved(false); }} disabled={busy} className="h-8 min-w-32 text-xs"><option value={role}>{ROLE_LABELS[role]}</option>{allowedRoles.filter((candidate) => candidate !== role).map((candidate) => <option key={candidate} value={candidate}>{ROLE_LABELS[candidate]}</option>)}</Select><Button size="sm" variant="outline" onClick={save} disabled={busy || nextRole === role}>{busy ? "Saving…" : "Save role"}</Button>{error && <span role="alert" className="text-xs text-red-700">{error}</span>}{saved && <span role="status" className="text-xs text-emerald-700">Role updated.</span>}</div>;
}
