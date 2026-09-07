"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function PromoteUserButton({ userId, label = "Make Super Admin" }: { userId: string; label?: string }) { const router = useRouter(); const [busy, setBusy] = useState(false); return <Button size="sm" variant="outline" disabled={busy} onClick={async () => { if (!window.confirm("Promote this user to Super Admin? This grants full control of the portal.")) return; setBusy(true); try { const r = await fetch(`/api/users/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "SUPER_ADMIN" }) }); const j = await r.json(); if (!r.ok) window.alert(j.error ?? "Promotion failed"); else router.refresh(); } finally { setBusy(false); } }}>{busy ? "Updating…" : label}</Button>; }
