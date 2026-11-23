"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, FileDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeeDisplay } from "@/components/currency";
import { ApplyButton } from "@/components/apply-button";
import { ProgramDetailDialog } from "@/components/program-detail-dialog";
import { ProgramForm } from "@/components/program-form";
import { DeleteButton } from "@/components/delete-button";
import { formatDate } from "@/lib/utils";
import { programLevelLabel } from "@/lib/constants";

/** Everything `ProgramDetailDialog` and `ProgramForm` need for one row. */
export type BulkProgramDetail = {
  id: string;
  slug: string | null;
  universityId: string;
  name: string;
  level: string;
  field: string;
  location: string | null;
  tuitionFee: number;
  applicationFee: number | null;
  intakeDates: string[];
  requiredDocuments: string[];
  minGpa: number | null;
  visaRequired: boolean;
  commissionRate: number;
  tags: string[];
  offerTurnaroundDays: number | null;
  collegeRank: string | null;
  eligibilityCriteria: string[];
  courseDurationMonths: number | null;
  universityLogoUrl: string | null;
  university: { id: string; name: string; country: string; city: string | null; logoUrl: string | null } | null;
};

export type BulkProgram = {
  id: string;
  slug: string | null;
  name: string;
  level: string;
  field: string;
  tuitionFee: number;
  nextIntake: string | null;
  detail?: BulkProgramDetail;
};

export type BulkGroup = {
  universityId: string;
  universityName: string;
  city: string;
  country: string;
  totalPrograms: number;
  programs: BulkProgram[];
};

const MAX_SELECT = 50;

// Pagination navigations are client-side, so module state survives them and the
// selection is not lost when the reader moves between pages.
const selectionStore = new Set<string>();

type Props = {
  groups: BulkGroup[];
  /** Students get "Apply"; staff get the detail dialog and, if allowed, edit/delete. */
  viewer?: "student" | "staff";
  profileReady?: boolean;
  canManage?: boolean;
  canViewAnalytics?: boolean;
  universities?: { id: string; name: string; country: string }[];
};

export function BulkExportList({
  groups,
  viewer = "student",
  profileReady = false,
  canManage = false,
  canViewAnalytics = false,
  universities = [],
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectionStore));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageIds = groups.flatMap((group) => group.programs.map((program) => program.id));
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function commit(next: Set<string>) {
    selectionStore.clear();
    next.forEach((id) => selectionStore.add(id));
    setSelected(next);
  }

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < MAX_SELECT) next.add(id);
    commit(next);
  }

  function togglePage() {
    const next = new Set(selected);
    if (allOnPageSelected) {
      pageIds.forEach((id) => next.delete(id));
    } else {
      for (const id of pageIds) {
        if (next.size >= MAX_SELECT) break;
        next.add(id);
      }
    }
    commit(next);
  }

  async function exportPdf() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/programs/pdf-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programIds: [...selected] }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error ?? "Export failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "program-details.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Network error while exporting.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas-subtle/60 px-4 py-3 dark:border-navy-700 dark:bg-navy-800/40">
        <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={allOnPageSelected}
            onChange={togglePage}
            aria-label="Choose all programs on this page"
          />
          Select all on this page
          <span className="text-xs font-normal text-ink-muted">({pageIds.length})</span>
        </label>
        <p className="text-xs text-ink-muted">Choose the programs you want, then download one PDF with all of them.</p>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-brand-800 dark:bg-navy-900/95">
          <p role="status" className="text-sm font-medium">
            {selected.size} program{selected.size > 1 ? "s" : ""} selected
            <span className="ml-2 text-xs text-ink-muted">up to 50 programs per PDF</span>
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => commit(new Set())} disabled={busy}>
              Clear
            </Button>
            <Button size="sm" onClick={exportPdf} disabled={busy}>
              <FileDown aria-hidden className="mr-1 h-4 w-4" />
              {busy ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-300">
          {error}
        </p>
      )}

      {groups.map(({ universityId, universityName, city, country, programs, totalPrograms }) => (
        <Card key={universityId}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 dark:border-navy-700">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-lg font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  {universityName[0]}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{universityName}</h2>
                  <p className="truncate text-xs text-ink-muted">{city}, {country}</p>
                </div>
              </div>
              <Badge tone="slate">
                {programs.length === totalPrograms
                  ? `${programs.length} program${programs.length === 1 ? "" : "s"}`
                  : `${programs.length} of ${totalPrograms}`}
              </Badge>
            </div>
            <div className="divide-y divide-line dark:divide-navy-700">
              {programs.map((p) => (
                <div key={p.id} data-program-row={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-canvas dark:hover:bg-navy-800/40">
                  {/* The 16 px box sits inside a 36 px hit area so the select
                      target meets WCAG 2.2 (§2.5.8) without a giant control. */}
                  <label className="-my-1 inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg hover:bg-canvas-subtle dark:hover:bg-navy-800">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      aria-label={`Select ${p.name}`}
                    />
                  </label>
                  <div className="min-w-0 flex-1">
                    {viewer === "student" ? (
                      <Link href={`/scholarships/${p.slug ?? p.id}`} className="inline-flex min-h-6 items-center font-medium hover:text-brand-600 hover:underline">
                        {p.name}
                      </Link>
                    ) : canViewAnalytics ? (
                      <Link href={`/programs/${p.id}/analytics`} className="inline-flex min-h-6 items-center font-medium hover:text-brand-600 hover:underline">
                        {p.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{p.name}</span>
                    )}
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <Badge tone="slate">{programLevelLabel(p.level)}</Badge>
                      <span>{p.field}</span>
                      {p.nextIntake && <span>Next intake {formatDate(p.nextIntake)}</span>}
                    </div>
                  </div>
                  <div className="text-sm">
                    <FeeDisplay amount={p.tuitionFee} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {viewer === "student" ? (
                      <>
                        <ApplyButton programId={p.id} profileReady={profileReady} programName={p.name} />
                        <Link
                          href={`/scholarships/${p.slug ?? p.id}`}
                          aria-label={`View ${p.name}`}
                          className="inline-flex min-h-6 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
                        >
                          <ExternalLink aria-hidden className="h-3 w-3" /> View
                        </Link>
                      </>
                    ) : (
                      <>
                        {p.detail && <ProgramDetailDialog program={p.detail} />}
                        {canManage && p.detail && (
                          <>
                            <ProgramForm
                              universities={universities}
                              initial={{
                                id: p.detail.id,
                                universityId: p.detail.universityId,
                                name: p.detail.name,
                                level: p.detail.level,
                                field: p.detail.field,
                                location: p.detail.location ?? undefined,
                                tuitionFee: String(p.detail.tuitionFee),
                                applicationFee: p.detail.applicationFee == null ? "" : String(p.detail.applicationFee),
                                intakeDates: p.detail.intakeDates,
                                requiredDocuments: p.detail.requiredDocuments,
                                minGpa: p.detail.minGpa,
                                visaRequired: p.detail.visaRequired,
                                commissionRate: String(p.detail.commissionRate),
                                tags: p.detail.tags,
                                offerTurnaroundDays: p.detail.offerTurnaroundDays,
                                collegeRank: p.detail.collegeRank ?? undefined,
                                eligibilityCriteria: p.detail.eligibilityCriteria,
                                courseDurationMonths: p.detail.courseDurationMonths,
                                universityLogoUrl: p.detail.universityLogoUrl ?? undefined,
                              }}
                            />
                            <DeleteButton endpoint={`/api/scholarships/${p.id}`} itemName={p.name} />
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {viewer === "staff" && canManage && (
        <p className="text-xs text-ink-muted">
          Need another program? Use <span className="inline-flex items-center gap-0.5 font-medium"><Plus aria-hidden className="h-3 w-3" /> Add program</span> above the list.
        </p>
      )}
    </div>
  );
}
