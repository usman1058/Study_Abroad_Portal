"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function WorkingCountriesForm({ initial }: { initial: string[] }) {
  const router = useRouter();
  const [value, setValue] = useState(initial.join("\n"));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const countries = value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
      const response = await fetch("/api/working-countries", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ countries }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(result.error ?? "Could not save countries."); return; }
      setValue(result.data.countries.join("\n")); setMessage("Working countries saved."); router.refresh();
    } catch { setMessage("Network error. Please retry."); } finally { setBusy(false); }
  }
  return <form onSubmit={save} className="space-y-3">
    <p className="text-sm text-ink-muted">These destinations control country options in university creation and destination filters. Enter one country per line or separate them with commas.</p>
    <textarea aria-label="Working countries" value={value} onChange={(event) => setValue(event.target.value)} rows={5} maxLength={9000} placeholder={"Malaysia\nUnited Kingdom\nAustralia"} className="w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-sm dark:bg-navy-900" />
    <button disabled={busy} className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Saving…" : "Save countries"}</button>
    {message && <p role="status" className="text-sm text-ink-muted">{message}</p>}
  </form>;
}
