"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DOCUMENT_TYPES } from "@/lib/constants";

export function UploadDocument({ applications }: { applications: { id: string; label: string }[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState("passport");
  const [applicationId, setApplicationId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
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
      router.refresh();
    } catch {
      setError("Could not read file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">{error}</div>}
      <div>
        <Label>Document type</Label>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label>Application (optional)</Label>
        <Select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
          <option value="">General document</option>
          {applications.map((a) => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Label>File</Label>
        <Input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload document"}</Button>
      </div>
    </form>
  );
}