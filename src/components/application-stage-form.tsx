"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { APPLICATION_STAGES, VISA_STAGES } from "@/lib/constants";
import type { ApplicationStage } from "@/generated/prisma/client";
import { APPLICATION_STAGE_TRANSITIONS, DOC_GATED_APPLICATION_STAGES } from "@/lib/application-stages";

export function ApplicationStageForm({
  applicationId,
  stage,
  visaStage,
  visaRequired,
  documentsReady,
}: {
  applicationId: string;
  stage: ApplicationStage;
  visaStage?: string | null;
  visaRequired: boolean;
  documentsReady: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(stage);
  const [currentVisa, setCurrentVisa] = useState(visaStage ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ApplicationStage | null>(null);
  const [saved, setSaved] = useState(false);
  const availableStages = [stage, ...APPLICATION_STAGE_TRANSITIONS[stage]].filter(
    (candidate) => candidate === stage || !DOC_GATED_APPLICATION_STAGES.includes(candidate) || documentsReady,
  );

  async function save() {
    if (current !== stage && ["ENROLLED", "REJECTED", "WITHDRAWN"].includes(current) && confirmation !== current) {
      setConfirmation(current);
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
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
      setConfirmation(null);
      setSaved(true);
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
          <Label htmlFor="application-stage">Pipeline stage</Label>
          <Select id="application-stage" value={current} onChange={(e) => { setCurrent(e.target.value as ApplicationStage); setConfirmation(null); setSaved(false); }}>
            {APPLICATION_STAGES.filter((s) => availableStages.includes(s.value)).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </Select>
        </div>
        {visaRequired && (
          <div>
          <Label htmlFor="application-visa-stage">Visa sub-stage</Label>
          <Select id="application-visa-stage" value={currentVisa} onChange={(e) => { setCurrentVisa(e.target.value); setSaved(false); }}>
              <option value="">—</option>
              {VISA_STAGES.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {!documentsReady && APPLICATION_STAGE_TRANSITIONS[stage].some((candidate) => DOC_GATED_APPLICATION_STAGES.includes(candidate)) && (
        <p className="text-xs text-amber-700 dark:text-amber-300">Complete all required document uploads and verification to unlock the next decision stage.</p>
      )}
      {error && <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {confirmation && <div role="alert" className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <p>Confirm moving this application to {APPLICATION_STAGES.find((item) => item.value === confirmation)?.label}. {confirmation === "REJECTED" ? "The application will be closed as rejected." : confirmation === "WITHDRAWN" ? "The application will be withdrawn." : "This is a terminal stage."}</p>
        <Button size="sm" variant="danger" onClick={() => save()} disabled={busy}>Confirm stage change</Button>
        <Button size="sm" variant="outline" onClick={() => setConfirmation(null)} disabled={busy}>Cancel</Button>
      </div>}
      {saved && <p role="status" className="text-sm text-emerald-700">Application stage saved.</p>}
      <Button onClick={save} disabled={busy} size="sm">
        {busy ? "Saving…" : "Save stage"}
      </Button>
    </div>
  );
}
