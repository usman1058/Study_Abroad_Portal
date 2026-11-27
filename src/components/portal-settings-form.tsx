"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatUploadSizeMB, UPLOAD_SIZE_OPTIONS_MB } from "@/lib/upload-limits";

type Settings = { bankName: string; accountName: string; accountNumber: string; iban: string; bankInstructions: string; whatsappNumber: string; maxUploadSizeMB: number };
const blank: Settings = { bankName: "", accountName: "", accountNumber: "", iban: "", bankInstructions: "", whatsappNumber: "", maxUploadSizeMB: 3 };

function normalizeSettings(value: Partial<Settings> | null | undefined): Settings {
  return {
    bankName: typeof value?.bankName === "string" ? value.bankName : "",
    accountName: typeof value?.accountName === "string" ? value.accountName : "",
    accountNumber: typeof value?.accountNumber === "string" ? value.accountNumber : "",
    iban: typeof value?.iban === "string" ? value.iban : "",
    bankInstructions: typeof value?.bankInstructions === "string" ? value.bankInstructions : "",
    whatsappNumber: typeof value?.whatsappNumber === "string" ? value.whatsappNumber : "",
    maxUploadSizeMB: typeof value?.maxUploadSizeMB === "number" ? value.maxUploadSizeMB : blank.maxUploadSizeMB,
  };
}

export function PortalSettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(() => normalizeSettings(initial));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => setForm(normalizeSettings(initial)), [initial]);
  function change(key: keyof Settings, value: string | number) { setForm((current) => ({ ...current, [key]: value })); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/portal-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error ?? "Could not save settings."); return; }
      setForm(normalizeSettings(result.data)); setMessage("Portal settings saved.");
      window.dispatchEvent(new Event("portal-contact-settings-updated"));
      router.refresh();
    } catch { setMessage("Network error. Please retry."); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-6">
    <section className="rounded-2xl border border-line bg-gradient-to-br from-white to-blue-50/50 p-5 dark:border-navy-700 dark:from-navy-900 dark:to-blue-950/20 sm:p-6" aria-labelledby="payment-instructions-heading">
      <div className="mb-5"><h3 id="payment-instructions-heading" className="text-base font-semibold">Payment instructions</h3><p className="mt-1 text-sm text-ink-muted">These bank details will be visible to students on their Payments page.</p></div>
      <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{([["bankName","Bank name"],["accountName","Account holder"],["accountNumber","Account number"],["iban","IBAN / routing number"]] as const).map(([key,label]) => <label key={key} className="block text-sm font-medium">{label}<input value={form[key]} onChange={(e) => change(key,e.target.value)} maxLength={160} className="mt-2 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>)}</div>
      <label className="mt-5 block text-sm font-medium">Payment instructions<textarea value={form.bankInstructions} onChange={(e) => change("bankInstructions",e.target.value)} maxLength={500} rows={4} className="mt-2 w-full rounded-lg border border-line-strong bg-white px-3 py-3 text-sm dark:bg-navy-900" /></label>
    </section>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-line bg-gradient-to-br from-white to-violet-50/40 p-5 dark:border-navy-700 dark:from-navy-900 dark:to-violet-950/20 sm:p-6" aria-labelledby="whatsapp-settings-heading">
        <h3 id="whatsapp-settings-heading" className="text-base font-semibold">WhatsApp contact</h3><p className="mt-1 text-sm text-ink-muted">Optional. Add the agency number with its country code to enable the WhatsApp button.</p>
        <label className="mt-5 block text-sm font-medium">Contact number<input aria-label="WhatsApp contact number" inputMode="tel" value={form.whatsappNumber} onChange={(e) => change("whatsappNumber",e.target.value)} maxLength={24} placeholder="60123456789" className="mt-2 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>
      </section>
      <section className="space-y-3 rounded-2xl border border-line bg-gradient-to-br from-white to-indigo-50/50 p-5 dark:border-navy-700 dark:from-navy-900 dark:to-indigo-950/20 sm:p-6" aria-labelledby="upload-limit-heading">
        <div><h3 id="upload-limit-heading" className="text-base font-semibold">Upload size limit</h3><p className="mt-1 text-sm text-ink-muted">Applies to each file and combined files in a partner application. Students and staff see the limit before uploading.</p></div>
        <label className="block text-sm font-medium" htmlFor="max-upload-size">Maximum upload size</label>
        <select id="max-upload-size" value={form.maxUploadSizeMB} onChange={(e) => change("maxUploadSizeMB", Number(e.target.value))} className="min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900">
          {UPLOAD_SIZE_OPTIONS_MB.map((size) => <option key={size} value={size}>{formatUploadSizeMB(size)}</option>)}
        </select>
        <p className="text-sm text-ink-muted">Current limit: <strong className="text-ink">{formatUploadSizeMB(form.maxUploadSizeMB)}</strong>. The available range keeps uploads within the portal host’s request-size limit.</p>
      </section>
    </div>
    <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center dark:border-navy-700">
      <button disabled={busy} className="min-h-11 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50">{busy ? "Saving…" : "Save portal settings"}</button>
    {message && <p role="status" className="text-sm text-ink-muted">{message}</p>}
    </div>
  </form>;
}

export { blank as blankPortalSettings };
