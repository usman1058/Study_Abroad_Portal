"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/label";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { humanize } from "@/lib/utils";
import { formatUploadSizeMB } from "@/lib/upload-limits";
import { useUploadLimit } from "@/hooks/use-upload-limit";
import { canConvertImageToWebP, prepareUploadFile } from "@/lib/upload-image";

export function UploadDocument({
  applications,
  defaultApplicationId = "",
  defaultType = "PASSPORT",
  submitLabel = "Upload document",
  replaceDocumentId,
}: {
  applications: { id: string; label: string }[];
  defaultApplicationId?: string;
  defaultType?: string;
  submitLabel?: string;
  replaceDocumentId?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState(defaultType);
  const [applicationId, setApplicationId] = useState(defaultApplicationId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { maxUploadSizeMB, maxUploadSizeBytes } = useUploadLimit();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    if (file.size > maxUploadSizeBytes && !canConvertImageToWebP(file)) {
      setError(`This file is too large. Choose a file no larger than ${formatUploadSizeMB(maxUploadSizeMB)}. PDF and Word files cannot be automatically compressed.`);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    setDone(false);
    try {
      const prepared = await prepareUploadFile(file, maxUploadSizeBytes);
      if (prepared.file.size > maxUploadSizeBytes) {
        setError(`This file is too large. Choose a file no larger than ${formatUploadSizeMB(maxUploadSizeMB)}.`);
        return;
      }
      if (prepared.convertedToWebP) setNotice(`Image optimized to WebP and reduced to ${formatUploadSizeMB(prepared.file.size / (1024 * 1024))}.`);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(prepared.file);
      });
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, applicationId: applicationId || null, fileName: prepared.file.name, base64, ...(replaceDocumentId ? { replaceDocumentId } : {}) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Upload failed");
        return;
      }
      fileRef.current!.value = "";
      setDone(true);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare the selected file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} data-upload-form className="grid gap-4 sm:grid-cols-2">
      {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</div>}
      {done && <div role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800 sm:col-span-2">{replaceDocumentId ? "Replacement uploaded. It is waiting for staff review." : "Upload received. It is now waiting for staff review."}</div>}
      <Field label="Document type">
        <Select value={type} onChange={(e) => setType(e.target.value)} disabled={Boolean(replaceDocumentId)}>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>{humanize(t)}</option>
          ))}
        </Select>
      </Field>
      <Field label="Application (optional)">
        <Select value={applicationId} onChange={(e) => setApplicationId(e.target.value)} disabled={Boolean(replaceDocumentId)}>
          <option value="">General document</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </Select>
      </Field>
      {notice && <p role="status" className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800 sm:col-span-2">{notice}</p>}
      <Field label="File" hint={`Maximum file size: ${formatUploadSizeMB(maxUploadSizeMB)}. JPG/PNG images are optimized as WebP; PDF, WebP and Word files keep their format.`} className="sm:col-span-2">
        <Input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(event) => {
          const selected = event.target.files?.[0];
          setNotice(null);
          setError(selected && selected.size > maxUploadSizeBytes && !canConvertImageToWebP(selected)
            ? `This file is too large. Choose a file no larger than ${formatUploadSizeMB(maxUploadSizeMB)}. PDF and Word files cannot be automatically compressed.`
            : null);
          if (selected && selected.size > maxUploadSizeBytes && canConvertImageToWebP(selected)) {
            setNotice(`This image will be resized/compressed to WebP before upload (maximum ${formatUploadSizeMB(maxUploadSizeMB)}).`);
          }
        }} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>{busy ? "Uploading…" : submitLabel}</Button>
      </div>
    </form>
  );
}
