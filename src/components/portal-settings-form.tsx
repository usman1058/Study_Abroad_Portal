"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUploadSizeMB, UPLOAD_SIZE_OPTIONS_MB } from "@/lib/upload-limits";

type Settings = { bankName: string; accountName: string; accountNumber: string; iban: string; bankInstructions: string; whatsappNumber: string; maxUploadSizeMB: number };
const blank: Settings = { bankName: "", accountName: "", accountNumber: "", iban: "", bankInstructions: "", whatsappNumber: "", maxUploadSizeMB: 3 };

export function PortalSettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setForm(initial), [initial]);
  function change(key: keyof Settings, value: string | number) { setForm((current) => ({ ...current, [key]: value })); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/portal-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error ?? "Could not save settings."); return; }
      setForm(result.data); setMessage("Portal settings saved.");
      window.dispatchEvent(new Event("portal-contact-settings-updated"));
      router.refresh();
    } catch { setMessage("Network error. Please retry."); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-4">
    <div><h3 className="font-semibold">Payment instructions</h3><p className="text-sm text-ink-muted">These bank details will be visible to students on their Payments page.</p></div>
    <div className="grid gap-3 sm:grid-cols-2">{([["bankName","Bank name"],["accountName","Account holder"],["accountNumber","Account number"],["iban","IBAN / routing number"]] as const).map(([key,label]) => <label key={key} className="block text-sm font-medium">{label}<input value={form[key]} onChange={(e) => change(key,e.target.value)} maxLength={160} className="mt-1 min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>)}</div>
    <label className="block text-sm font-medium">Payment instructions<textarea value={form.bankInstructions} onChange={(e) => change("bankInstructions",e.target.value)} maxLength={500} rows={3} className="mt-1 w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm dark:bg-navy-900" /></label>
    <label className="block text-sm font-medium">WhatsApp contact number<p className="mb-1 text-xs font-normal text-ink-muted">Optional. Leave blank to show WhatsApp as not set up. To enable the WhatsApp button, enter the agency number with its country code, for example 60123456789.</p><input aria-label="WhatsApp contact number" inputMode="tel" value={form.whatsappNumber} onChange={(e) => change("whatsappNumber",e.target.value)} maxLength={24} className="min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>
    <section className="space-y-2 rounded-xl border border-line p-4 dark:border-navy-700" aria-labelledby="upload-limit-heading">
      <div><h3 id="upload-limit-heading" className="font-semibold">Upload size limit</h3><p className="text-sm text-ink-muted">Applies to each file and to the combined files in a partner application. Students and staff will see this limit before upload.</p></div>
      <label className="block text-sm font-medium" htmlFor="max-upload-size">Maximum upload size</label>
      <select id="max-upload-size" value={form.maxUploadSizeMB} onChange={(e) => change("maxUploadSizeMB", Number(e.target.value))} className="min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900">
        {UPLOAD_SIZE_OPTIONS_MB.map((size) => <option key={size} value={size}>{formatUploadSizeMB(size)}</option>)}
      </select>
      <p className="text-xs text-ink-muted">Current limit: {formatUploadSizeMB(form.maxUploadSizeMB)}. The available range keeps uploads within the portal host’s request-size limit.</p>
    </section>
    <button disabled={busy} className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save portal settings"}</button>
    {message && <p role="status" className="text-sm text-ink-muted">{message}</p>}
  </form>;
}

export { blank as blankPortalSettings };
