"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUploadSizeMB } from "@/lib/upload-limits";
import { useUploadLimit } from "@/hooks/use-upload-limit";
import { canConvertImageToWebP, prepareUploadFile } from "@/lib/upload-image";

/** Receipt upload used while an enrolment is `pending_payment` or `rejected`. */
export function UploadReceipt({ shortCourseId }: { shortCourseId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const { maxUploadSizeMB, maxUploadSizeBytes } = useUploadLimit();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      fileRef.current?.focus();
      return;
    }
    if (file.size > maxUploadSizeBytes && !canConvertImageToWebP(file)) {
      setError(`This file is too large. Choose a file no larger than ${formatUploadSizeMB(maxUploadSizeMB)}. PDF and Word files cannot be automatically compressed.`);
      fileRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const prepared = await prepareUploadFile(file, maxUploadSizeBytes);
      if (prepared.file.size > maxUploadSizeBytes) {
        setError(`This file is too large. Choose a file no larger than ${formatUploadSizeMB(maxUploadSizeMB)}.`);
        fileRef.current?.focus();
        return;
      }
      if (prepared.convertedToWebP) {
        setFileName(prepared.file.name);
        setNotice(`Image optimized to WebP (${formatUploadSizeMB(prepared.file.size / (1024 * 1024))}).`);
      }
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(prepared.file);
      });
      const res = await fetch(`/api/short-courses/${shortCourseId}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: prepared.file.name, base64 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Upload failed. Please try again.");
        fileRef.current?.focus();
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      setFileName("");
      setNotice(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not prepare the selected file.");
      fileRef.current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
          {error}
        </p>
      )}
      <div>
        <Label htmlFor="receipt-file">Receipt file</Label>
        <Input
          ref={fileRef}
          id="receipt-file"
          name="receipt"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={(e) => {
            const selected = e.target.files?.[0];
            setFileName(selected?.name ?? "");
            setNotice(null);
            setError(selected && selected.size > maxUploadSizeBytes && !canConvertImageToWebP(selected)
              ? `This file is too large. Choose a file no larger than ${formatUploadSizeMB(maxUploadSizeMB)}. PDF and Word files cannot be automatically compressed.`
              : null);
            if (selected && selected.size > maxUploadSizeBytes && canConvertImageToWebP(selected)) {
              setNotice(`This image will be resized/compressed to WebP before upload (maximum ${formatUploadSizeMB(maxUploadSizeMB)}).`);
            }
          }}
          aria-describedby="receipt-help"
        />
        <p id="receipt-help" className="mt-1 text-xs text-ink-muted">
          PDF, JPG, PNG, WebP, DOC or DOCX · maximum {formatUploadSizeMB(maxUploadSizeMB)}. JPG/PNG images are optimized as WebP.{fileName ? ` Selected: ${fileName}.` : ""}
        </p>
        {notice && <p role="status" className="mt-1 text-xs text-blue-700 dark:text-blue-300">{notice}</p>}
      </div>
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Uploading…" : "Upload receipt"}
        </Button>
      </div>
    </form>
  );
}
