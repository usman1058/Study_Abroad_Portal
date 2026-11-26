"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@/generated/prisma/client";

type RequestItem = { id: string; country: string; reason: string | null; status: "PENDING" | "APPROVED" | "REJECTED"; decisionNote: string | null; createdAt: string; requester?: { firstName: string; lastName: string; email: string; role: Role } };

export function CountryRequestsPanel({ role }: { role: Role }) {
  const router = useRouter();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [country, setCountry] = useState("");
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const isAdmin = role === "SUPER_ADMIN";
  async function load() {
    const response = await fetch("/api/country-requests", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (response.ok) setItems(result.data.requests);
  }
  useEffect(() => { void load(); }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusyId("new"); setMessage("");
    try {
      const response = await fetch("/api/country-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country, reason }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error ?? "Could not submit request."); return; }
      setCountry(""); setReason(""); setMessage("Country request sent to the admin for review."); await load();
    } catch { setMessage("Network error. Please retry."); } finally { setBusyId(""); }
  }
  async function review(item: RequestItem, status: "APPROVED" | "REJECTED") {
    setBusyId(item.id); setMessage("");
    try {
      const response = await fetch("/api/country-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, status, decisionNote }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error ?? "Could not review request."); return; }
      setMessage(`${item.country} ${status === "APPROVED" ? "added to working countries" : "request declined"}.`); setDecisionNote(""); await load(); router.refresh();
    } catch { setMessage("Network error. Please retry."); } finally { setBusyId(""); }
  }
  return <div className="space-y-5" id="country-requests">
    {!isAdmin && <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Country to request<input required minLength={2} maxLength={80} value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country name" className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>
      <label className="text-sm font-medium">Reason (optional)<input maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why should we add this destination?" className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>
      <button disabled={busyId === "new"} className="min-h-10 w-fit rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busyId === "new" ? "Sending…" : "Request country"}</button>
    </form>}
    {message && <p role="status" className="text-sm text-ink-muted">{message}</p>}
    {isAdmin && items.some((item) => item.status === "PENDING") && <label className="block text-sm font-medium">Optional admin decision note<input maxLength={500} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Explain the decision to the requester" className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>}
    {items.length === 0 ? <p className="text-sm text-ink-muted">{isAdmin ? "No country requests yet." : "You have not requested any countries yet."}</p> : <ul className="divide-y divide-line rounded-xl border border-line dark:divide-navy-700 dark:border-navy-700">
      {items.map((item) => <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{item.country}</strong><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === "PENDING" ? "bg-amber-100 text-amber-800" : item.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{item.status.toLowerCase()}</span></div><p className="mt-1 text-xs text-ink-muted">{item.requester ? `Requested by ${item.requester.firstName} ${item.requester.lastName} · ${item.requester.email} · ${item.requester.role.toLowerCase()}` : "Your request"} · {new Date(item.createdAt).toLocaleDateString()}</p>{item.reason && <p className="mt-1 text-sm text-ink-muted">{item.reason}</p>}{item.decisionNote && <p className="mt-1 text-sm">Admin note: {item.decisionNote}</p>}</div>{isAdmin && item.status === "PENDING" && <div className="flex gap-2"><button disabled={busyId === item.id} onClick={() => void review(item, "APPROVED")} className="min-h-9 rounded-lg bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50">Approve</button><button disabled={busyId === item.id} onClick={() => void review(item, "REJECTED")} className="min-h-9 rounded-lg border border-line-strong px-3 text-sm font-semibold disabled:opacity-50">Decline</button></div>}</li>)}
    </ul>}
  </div>;
}
