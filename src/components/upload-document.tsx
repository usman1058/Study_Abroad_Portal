"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/label";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { humanize } from "@/lib/utils";

export function UploadDocument({
  applications,
  defaultApplicationId = "",
  defaultType = "PASSPORT",
  submitLabel = "Upload document",
}: {
  applications: { id: string; label: string }[];
  defaultApplicationId?: string;
  defaultType?: string;
  submitLabel?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(defaultType);
  const [applicationId, setApplicationId] = useState(defaultApplicationId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Maximum size is 5 MB.");
      return;
    }
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, applicationId: applicationId || null, fileName: file.name, base64 }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
        return;
      }
      fileRef.current!.value = "";
      setDone(true);
      router.refresh();
    } catch {
      setError("Could not read file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} data-upload-form className="grid gap-4 sm:grid-cols-2">
      {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</div>}
      {done && <div role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 sm:col-span-2">Upload received. It is now waiting for staff review.</div>}
      <Field label="Document type">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>{humanize(t)}</option>
          ))}
        </Select>
      </Field>
      <Field label="Application (optional)">
        <Select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
          <option value="">General document</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </Select>
      </Field>
      <Field label="File" hint="PDF, JPG, PNG or DOC up to 5 MB." className="sm:col-span-2">
        <Input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>{busy ? "Uploading…" : submitLabel}</Button>
      </div>
    </form>
  );
}
