"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import { UploadDocument } from "@/components/upload-document";

export type WizardPersonal = {
  userTitle?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  gender?: string | null;
  birthday?: string | Date | null;
  passportNumber?: string | null;
  nationality?: string | null;
  countryOfResidence?: string | null;
  cityOfResidence?: string | null;
  address?: string | null;
  motherName?: string | null;
  fatherName?: string | null;
};

export type WizardEducation = {
  level: string;
  institution: string;
  fieldOfStudy?: string;
  startYear?: string;
  endYear?: string;
  grade?: string;
};

const STEPS = ["Personal details", "Academic history", "Documents", "University & submit"] as const;

const EMPTY_EDU: WizardEducation = { level: "", institution: "", fieldOfStudy: "", startYear: "", endYear: "", grade: "" };

export function ApplicationWizard({
  programs,
  personal,
  education,
  documents,
  draftId,
  draftProgramId,
}: {
  programs: { id: string; label: string }[];
  personal: WizardPersonal;
  education: WizardEducation[];
  documents: { type: string; status: string }[];
  draftId?: string;
  draftProgramId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pForm, setPForm] = useState<WizardPersonal>({
    ...personal,
    gender: personal.gender ?? "",
    birthday: personal.birthday ? new Date(personal.birthday).toISOString().slice(0, 10) : "",
    passportNumber: personal.passportNumber ?? "",
    nationality: personal.nationality ?? "",
    countryOfResidence: personal.countryOfResidence ?? "",
    cityOfResidence: personal.cityOfResidence ?? "",
    address: personal.address ?? "",
    motherName: personal.motherName ?? "",
    fatherName: personal.fatherName ?? "",
  });

  const [eduRows, setEduRows] = useState<WizardEducation[]>(
    education.length > 0 ? education : [{ ...EMPTY_EDU }]
  );

  const [programId, setProgramId] = useState(draftProgramId ?? "");

  const verifiedDocs = documents.filter((d) => d.status === "VERIFIED").length;

  const canNext = useMemo(() => {
    if (step === 0) {
      return Boolean(pForm.firstName && pForm.lastName && pForm.gender && pForm.birthday && pForm.passportNumber);
    }
    return true;
  }, [step, pForm]);

  async function saveProfile(payload: Record<string, unknown>): Promise<boolean> {
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Could not save your details.");
      return false;
    }
    return true;
  }

  async function next() {
    setError(null);
    setBusy(true);
    try {
      if (step === 0) {
        const okSaved = await saveProfile(pForm);
        if (!okSaved) return;
      }
      if (step === 1) {
        const rows = eduRows.filter((r) => r.level.trim() && r.institution.trim());
        const okSaved = await saveProfile({ educationHistory: rows });
        if (!okSaved) return;
      }
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setError(null);
    if (!draftId && !programId) {
      setError("Select a university program first.");
      return;
    }
    setBusy(true);
    try {
      let res: Response;
      if (draftId) {
        res = await fetch(`/api/applications/${draftId}/submit`, { method: "POST" });
      } else {
        res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ programId, submit: true }),
        });
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Submission failed.");
        return;
      }
      router.push("/my-applications?submitted=1");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function setP<K extends keyof WizardPersonal>(k: K, v: string) {
    setPForm((prev) => ({ ...prev, [k]: v }) as WizardPersonal);
  }
  function setEdu(i: number, k: keyof WizardEducation, v: string) {
    setEduRows((prev) => prev.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <ol className="mb-5 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={
                "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold " +
                (i === step
                  ? "bg-brand-600 text-white"
                  : i < step
                    ? "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400")
              }
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={"text-xs " + (i === step ? "font-semibold" : "text-slate-500")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 text-slate-300">→</span>}
          </li>
        ))}
      </ol>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{error}</div>}

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>First name *</Label>
            <Input maxLength={80} value={pForm.firstName ?? ""} onChange={(e) => setP("firstName", e.target.value)} />
          </div>
          <div>
            <Label>Last name *</Label>
            <Input maxLength={80} value={pForm.lastName ?? ""} onChange={(e) => setP("lastName", e.target.value)} />
          </div>
          <div>
            <Label>Gender *</Label>
            <Select value={pForm.gender ?? ""} onChange={(e) => setP("gender", e.target.value)}>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label>Date of birth *</Label>
            <Input type="date" value={pForm.birthday ? new Date(pForm.birthday).toISOString().slice(0, 10) : ""} onChange={(e) => setP("birthday", e.target.value)} />
          </div>
          <div>
            <Label>Passport number *</Label>
            <Input maxLength={20} value={pForm.passportNumber ?? ""} onChange={(e) => setP("passportNumber", e.target.value)} placeholder="A12345678" />
          </div>
          <div>
            <Label>Nationality</Label>
            <Input maxLength={80} value={pForm.nationality ?? ""} onChange={(e) => setP("nationality", e.target.value)} />
          </div>
          <div>
            <Label>Country of residence</Label>
            <Input maxLength={80} value={pForm.countryOfResidence ?? ""} onChange={(e) => setP("countryOfResidence", e.target.value)} />
          </div>
          <div>
            <Label>City of residence</Label>
            <Input maxLength={100} value={pForm.cityOfResidence ?? ""} onChange={(e) => setP("cityOfResidence", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Address</Label>
            <Textarea rows={2} maxLength={300} value={pForm.address ?? ""} onChange={(e) => setP("address", e.target.value)} />
          </div>
          <div>
            <Label>Mother&apos;s name</Label>
            <Input maxLength={80} value={pForm.motherName ?? ""} onChange={(e) => setP("motherName", e.target.value)} />
          </div>
          <div>
            <Label>Father&apos;s name</Label>
            <Input maxLength={80} value={pForm.fatherName ?? ""} onChange={(e) => setP("fatherName", e.target.value)} />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {eduRows.map((row, i) => (
            <div key={i} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3 dark:border-slate-800">
              <div>
                <Label>Level</Label>
                <Select value={row.level} onChange={(e) => setEdu(i, "level", e.target.value)}>
                  <option value="">Select…</option>
                  {["High School", "Diploma", "Foundation", "Bachelor", "Master", "Other"].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Institution *</Label>
                <Input maxLength={160} value={row.institution} onChange={(e) => setEdu(i, "institution", e.target.value)} placeholder="School / college / university" />
              </div>
              <div>
                <Label>Field of study</Label>
                <Input maxLength={160} value={row.fieldOfStudy ?? ""} onChange={(e) => setEdu(i, "fieldOfStudy", e.target.value)} placeholder="e.g. Computer Science" />
              </div>
              <div>
                <Label>From year</Label>
                <Input maxLength={9} value={row.startYear ?? ""} onChange={(e) => setEdu(i, "startYear", e.target.value)} placeholder="2019" />
              </div>
              <div>
                <Label>To year</Label>
                <Input maxLength={9} value={row.endYear ?? ""} onChange={(e) => setEdu(i, "endYear", e.target.value)} placeholder="2023" />
              </div>
              <div>
                <Label>Grade / CGPA</Label>
                <Input maxLength={60} value={row.grade ?? ""} onChange={(e) => setEdu(i, "grade", e.target.value)} placeholder="e.g. CGPA 3.4" />
              </div>
              <div className="sm:col-span-3">
                <Button type="button" size="sm" variant="ghost" className="text-red-600" disabled={eduRows.length === 1} onClick={() => setEduRows((prev) => prev.filter((_, idx) => idx !== i))}>
                  Remove this entry
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={() => setEduRows((prev) => [...prev, { ...EMPTY_EDU }])}>
            + Add education entry
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Upload your academic documents now — passport, transcripts and English test results speed up the review. Staff will verify them after you submit.
          </p>
          <UploadDocument applications={[]} />
          {documents.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {documents.map((d, i) => (
                <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{d.type.replace(/_/g, " ").toLowerCase()}</span>
                  <Badge tone={d.status === "VERIFIED" ? "green" : d.status === "REJECTED" ? "red" : "amber"}>
                    {DOCUMENT_STATUS_LABELS[d.status as keyof typeof DOCUMENT_STATUS_LABELS] ?? d.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-slate-500">
            {verifiedDocs}/{documents.length} verified so far — you can continue without verification and upload more later.
          </p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {draftId ? (
            <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-900/30 dark:text-brand-100">
              This submission completes your saved draft application.
            </div>
          ) : (
            <div>
              <Label>Choose university &amp; program *</Label>
              <Select value={programId} onChange={(e) => setProgramId(e.target.value)}>
                <option value="">Select a program…</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-slate-500">Browse full catalogs under Programs or Scholarships before deciding.</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-2">
        <Button type="button" variant="outline" disabled={step === 0 || busy} onClick={() => setStep((s) => s - 1)}>
          ← Back
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => router.refresh()} disabled={busy}>
            Close
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} disabled={!canNext || busy}>
              {busy ? "Saving…" : step === 0 || step === 1 ? "Save & continue" : "Continue"}
            </Button>
          ) : (
            <Button onClick={submit} disabled={busy}>
              {busy ? "Submitting…" : draftId ? "Complete & submit draft" : "Submit application"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
