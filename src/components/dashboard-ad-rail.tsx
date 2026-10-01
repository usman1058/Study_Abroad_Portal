"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type DashboardAd = {
  id: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  ctaLabel: string | null;
  active: boolean;
  sortOrder: number;
  startsAt: Date | string | null;
  endsAt: Date | string | null;
};

type FormState = {
  title: string; body: string; imageUrl: string; linkUrl: string; ctaLabel: string;
  active: boolean; sortOrder: string; startsAt: string; endsAt: string;
};

const blankForm: FormState = { title: "", body: "", imageUrl: "", linkUrl: "", ctaLabel: "Learn more", active: true, sortOrder: "0", startsAt: "", endsAt: "" };

function toDateInput(value: Date | string | null): string {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function adToForm(ad: DashboardAd): FormState {
  return { title: ad.title, body: ad.body ?? "", imageUrl: ad.imageUrl ?? "", linkUrl: ad.linkUrl ?? "", ctaLabel: ad.ctaLabel ?? "Learn more", active: ad.active, sortOrder: String(ad.sortOrder), startsAt: toDateInput(ad.startsAt), endsAt: toDateInput(ad.endsAt) };
}

export function DashboardAdRail({ ads, canManage = false }: { ads: DashboardAd[]; canManage?: boolean }) {
  const [allItems, setAllItems] = useState(ads);
  const [index, setIndex] = useState(0);
  const [manageOpen, setManageOpen] = useState(false);
  const now = Date.now();
  const items = allItems.filter((item) => item.active && (!item.startsAt || new Date(item.startsAt).getTime() <= now) && (!item.endsAt || new Date(item.endsAt).getTime() >= now));

  useEffect(() => { setAllItems(ads); setIndex(0); }, [ads]);
  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % items.length), 6500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const ad = items[index];
  const move = (direction: number) => setIndex((current) => (current + direction + items.length) % items.length);

  return (
    <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label="Dashboard announcements">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2 text-sm font-semibold"><Megaphone className="h-4 w-4 text-brand-600" /> Notices</div>
        {canManage && <Button size="sm" variant="ghost" onClick={() => setManageOpen(true)}><Pencil className="h-3.5 w-3.5" /> Manage</Button>}
      </div>
      {!ad ? (
        <div className="p-5 text-sm text-slate-500">No active announcements. Add one to highlight an offer, partner, or deadline.</div>
      ) : (
        <div className="relative">
          {ad.imageUrl ? <img src={ad.imageUrl} alt="" className="h-28 w-full object-cover" /> : <div className="h-28 bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-500" />}
          <div className="space-y-3 p-4">
            <div><p className="text-sm font-semibold">{ad.title}</p>{ad.body && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{ad.body}</p>}</div>
            {ad.linkUrl && <a href={ad.linkUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline">{ad.ctaLabel || "Learn more"}<ExternalLink className="h-3 w-3" /></a>}
          </div>
          {items.length > 1 && <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 dark:border-slate-800"><button type="button" onClick={() => move(-1)} aria-label="Previous announcement" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button><span className="text-[11px] text-slate-400">{index + 1} of {items.length}</span><button type="button" onClick={() => move(1)} aria-label="Next announcement" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button></div>}
        </div>
      )}
      {canManage && <AdvertisementManager open={manageOpen} onClose={() => setManageOpen(false)} ads={allItems} onChange={(next) => { setAllItems(next); setIndex(0); }} />}
    </aside>
  );
}

function AdvertisementManager({ open, onClose, ads, onChange }: { open: boolean; onClose: () => void; ads: DashboardAd[]; onChange: (ads: DashboardAd[]) => void }) {
  const [editing, setEditing] = useState<DashboardAd | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCreate() { setEditing(null); setForm(blankForm); setError(null); }
  function startEdit(ad: DashboardAd) { setEditing(ad); setForm(adToForm(ad)); setError(null); }
  function field(key: keyof FormState, value: string | boolean) { setForm((current) => ({ ...current, [key]: value })); }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(null);
    const payload = { ...form, sortOrder: Number(form.sortOrder), startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00.000Z`).toISOString() : null, endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59.999Z`).toISOString() : null };
    try {
      const response = await fetch(editing ? `/api/dashboard-ads/${editing.id}` : "/api/dashboard-ads", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await response.json();
      if (!response.ok) { setError(json.error ?? "Could not save the advertisement."); return; }
      const next = editing ? ads.map((ad) => ad.id === editing.id ? { ...ad, ...payload } : ad) : [{ ...payload, ...json.data, createdAt: new Date().toISOString() }, ...ads];
      onChange(next.sort((a, b) => a.sortOrder - b.sortOrder));
      startCreate();
    } catch { setError("Network error. Please try again."); } finally { setBusy(false); }
  }

  async function remove(ad: DashboardAd) {
    if (!window.confirm(`Delete “${ad.title}”?`)) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/dashboard-ads/${ad.id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) { setError(json.error ?? "Could not delete the advertisement."); return; }
      onChange(ads.filter((item) => item.id !== ad.id));
      if (editing?.id === ad.id) startCreate();
    } catch { setError("Network error. Please try again."); } finally { setBusy(false); }
  }

  return <Dialog open={open} onClose={onClose} title="Manage dashboard announcements" wide>
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <section className="space-y-3"><div className="flex items-center justify-between"><p className="text-sm font-medium">All announcements</p><Button size="sm" variant="outline" onClick={startCreate}><Plus className="h-3.5 w-3.5" /> New</Button></div>
        {ads.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">No announcements yet.</p> : <ul className="space-y-2">{ads.map((ad) => <li key={ad.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700"><span className={`h-2 w-2 rounded-full ${ad.active ? "bg-emerald-500" : "bg-slate-300"}`} /><button className="min-w-0 flex-1 text-left" onClick={() => startEdit(ad)}><span className="block truncate text-sm font-medium">{ad.title}</span><span className="text-xs text-slate-500">Order {ad.sortOrder} · {ad.active ? "Live" : "Paused"}</span></button><button className="rounded-md p-2 text-red-600 hover:bg-red-50" onClick={() => remove(ad)} aria-label={`Delete ${ad.title}`} disabled={busy}><Trash2 className="h-4 w-4" /></button></li>)}</ul>}
      </section>
      <form onSubmit={save} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><p className="font-medium">{editing ? "Edit announcement" : "New announcement"}</p>{error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        <div><Label>Title</Label><Input value={form.title} onChange={(event) => field("title", event.target.value)} maxLength={120} required /></div>
        <div><Label>Message</Label><Textarea value={form.body} onChange={(event) => field("body", event.target.value)} maxLength={400} /></div>
        <div><Label>Image URL (optional)</Label><Input type="url" value={form.imageUrl} onChange={(event) => field("imageUrl", event.target.value)} placeholder="https://…" /></div>
        <div className="grid gap-3 sm:grid-cols-2"><div><Label>Destination URL</Label><Input type="url" value={form.linkUrl} onChange={(event) => field("linkUrl", event.target.value)} placeholder="https://…" /></div><div><Label>Button label</Label><Input value={form.ctaLabel} onChange={(event) => field("ctaLabel", event.target.value)} maxLength={40} /></div></div>
        <div className="grid gap-3 sm:grid-cols-3"><div><Label>Order</Label><Input type="number" min="0" max="999" value={form.sortOrder} onChange={(event) => field("sortOrder", event.target.value)} /></div><div><Label>Starts</Label><Input type="date" value={form.startsAt} onChange={(event) => field("startsAt", event.target.value)} /></div><div><Label>Ends</Label><Input type="date" value={form.endsAt} onChange={(event) => field("endsAt", event.target.value)} /></div></div>
        <div className="flex items-center gap-2"><input id="ad-active" type="checkbox" checked={form.active} onChange={(event) => field("active", event.target.checked)} /><Label htmlFor="ad-active">Show this announcement</Label></div>
        <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create announcement"}</Button>{editing && <Button type="button" variant="outline" onClick={startCreate}>Cancel edit</Button>}</div>
      </form>
    </div>
  </Dialog>;
}
