"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { APPLICATION_STAGES, VISA_STAGES } from "@/lib/constants";
import type { ApplicationStage } from "@/generated/prisma/client";

export function ApplicationStageForm({
  applicationId,
  stage,
  visaStage,
  visaRequired,
}: {
  applicationId: string;
  stage: ApplicationStage;
  visaStage?: string | null;
  visaRequired: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(stage);
  const [currentVisa, setCurrentVisa] = useState(visaStage ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: current, visaStage: currentVisa || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to update stage");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Pipeline stage</Label>
          <Select value={current} onChange={(e) => setCurrent(e.target.value as ApplicationStage)}>
            {APPLICATION_STAGES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
        {visaRequired && (
          <div>
            <Label>Visa sub-stage</Label>
            <Select value={currentVisa} onChange={(e) => setCurrentVisa(e.target.value)}>
              <option value="">—</option>
              {VISA_STAGES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      <Button onClick={save} disabled={busy} size="sm">
        {busy ? "Saving…" : "Save stage"}
      </Button>
    </div>
  );
}