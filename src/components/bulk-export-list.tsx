"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeeDisplay } from "@/components/currency";
import { ApplyButton } from "@/components/apply-button";
import { formatDate } from "@/lib/utils";

export type BulkProgram = {
  id: string;
  slug: string | null;
  name: string;
  level: string;
  field: string;
  tuitionFee: number;
  nextIntake: string | null;
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
// shortlist selection is not lost when the student moves between pages.
const selectionStore = new Set<string>();

export function BulkExportList({ groups, profileReady }: { groups: BulkGroup[]; profileReady: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectionStore));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      a.download = "course-selection.pdf";
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
      {selected.size > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-brand-800 dark:bg-navy-900/95">
          <p className="text-sm font-medium">
            {selected.size} course{selected.size > 1 ? "s" : ""} selected
            <span className="ml-2 text-xs text-ink-muted">up to 50 courses per PDF</span>
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => commit(new Set())} disabled={busy}>
              Clear
            </Button>
            <Button size="sm" onClick={exportPdf} disabled={busy}>
              {busy ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

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
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/scholarships/${p.slug ?? p.id}`} className="inline-flex min-h-6 items-center font-medium hover:text-brand-600 hover:underline">
                      {p.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                      <Badge tone="slate">{p.level}</Badge>
                      <span>{p.field}</span>
                      {p.nextIntake && <span>Next intake {formatDate(p.nextIntake)}</span>}
                    </div>
                  </div>
                  <div className="text-sm">
                    <FeeDisplay amount={p.tuitionFee} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ApplyButton programId={p.id} profileReady={profileReady} />
                    <Link
                      href={`/scholarships/${p.slug ?? p.id}`}
                      aria-label={`View ${p.name}`}
                      className="inline-flex min-h-6 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
                    >
                      <ExternalLink aria-hidden className="h-3 w-3" /> View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
