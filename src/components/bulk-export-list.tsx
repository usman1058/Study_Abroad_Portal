"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  programs: BulkProgram[];
};

const MAX_SELECT = 50;

export function BulkExportList({ groups, profileReady }: { groups: BulkGroup[]; profileReady: boolean }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SELECT) next.add(id);
      return next;
    });
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
        <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur dark:border-brand-800 dark:bg-slate-900/95">
          <p className="text-sm font-medium">
            {selected.size} course{selected.size > 1 ? "s" : ""} selected
            <span className="ml-2 text-xs text-slate-500">pick 10–50 for a shareable shortlist PDF</span>
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} disabled={busy}>
              Clear
            </Button>
            <Button size="sm" onClick={exportPdf} disabled={busy}>
              {busy ? "Preparing…" : "Download PDF"}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {groups.map(({ universityId, universityName, city, country, programs }) => (
        <Card key={universityId}>
          <CardContent className="p-0">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-lg font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                  {universityName[0]}
                </span>
                <div>
                  <h2 className="font-semibold">{universityName}</h2>
                  <p className="text-xs text-slate-500">{city}, {country}</p>
                </div>
              </div>
              <Badge tone="slate">{programs.length} program{programs.length > 1 ? "s" : ""}</Badge>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {programs.map((p) => (
                <label key={p.id} className="flex cursor-pointer flex-wrap items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selected.has(p.id)}
                    onChange={() => toggle(p.id)}
                    aria-label={`Select ${p.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <Link href={`/scholarships/${p.slug ?? p.id}`} onClick={(e: React.MouseEvent) => e.stopPropagation()} className="font-medium hover:text-brand-600 hover:underline">
                      {p.name}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Badge tone="slate">{p.level}</Badge>
                      <span>{p.field}</span>
                      {p.nextIntake && <span>Next intake {formatDate(p.nextIntake)}</span>}
                    </div>
                  </div>
                  <div className="text-sm">
                    MYR {p.tuitionFee.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <ApplyButton programId={p.id} profileReady={profileReady} />
                    <Link
                      href={`/scholarships/${p.slug ?? p.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
                    >
                      <ExternalLink className="h-3 w-3" /> View
                    </Link>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
