"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_BYTES = 5 * 1024 * 1024;

/** Receipt upload used while an enrolment is `pending_payment` or `rejected`. */
export function UploadReceipt({ shortCourseId }: { shortCourseId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      fileRef.current?.focus();
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is too large. Maximum size is 5 MB.");
      fileRef.current?.focus();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`/api/short-courses/${shortCourseId}/receipt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, base64 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Upload failed. Please try again.");
        fileRef.current?.focus();
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
      setFileName("");
      router.refresh();
    } catch {
      setError("Could not read the file. Please choose it again.");
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
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => {
            setFileName(e.target.files?.[0]?.name ?? "");
            setError(null);
          }}
          aria-describedby="receipt-help"
        />
        <p id="receipt-help" className="mt-1 text-xs text-ink-muted">
          PDF, JPG, PNG or DOC up to 5 MB.{fileName ? ` Selected: ${fileName}.` : ""}
        </p>
      </div>
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? "Uploading…" : "Upload receipt"}
        </Button>
      </div>
    </form>
  );
}
