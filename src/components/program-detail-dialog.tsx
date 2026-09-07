"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

type Program = { id: string; name: string; level: string; field: string; location?: string | null; tuitionFee: number | string; applicationFee?: number | string | null; visaRequired: boolean; commissionRate?: number | string; intakeDates: (string | Date)[]; requiredDocuments: string[]; tags: string[]; university?: { id: string; name: string; country: string; city?: string | null; logoUrl?: string | null } | null };

export function ProgramDetailDialog({ program }: { program: Program }) {
  const [open, setOpen] = useState(false);
  const nextIntake = program.intakeDates.map((d) => new Date(d)).sort((a, b) => a.getTime() - b.getTime())[0];
  return <>
    <Button variant="outline" size="sm" onClick={() => setOpen(true)}><ExternalLink className="h-3.5 w-3.5" /> View details</Button>
    <Dialog open={open} onClose={() => setOpen(false)} title={program.name} wide>
      <div className="grid gap-6 md:grid-cols-[1fr_220px]">
        <div className="space-y-5">
          <div><p className="text-sm font-medium text-brand-600">{program.university?.name ?? "University"}</p><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-4 w-4" /> {program.location || program.university?.city || program.university?.country || "Location not set"}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Level" value={program.level} /><Info label="Field" value={program.field || "—"} /><Info label="Tuition" value={formatCurrency(Number(program.tuitionFee))} /><Info label="Application fee" value={program.applicationFee == null ? "—" : formatCurrency(Number(program.applicationFee))} /><Info label="Next intake" value={nextIntake ? formatDate(nextIntake) : "—"} /><Info label="Visa required" value={program.visaRequired ? "Yes" : "No"} />
          </div>
          <div><p className="mb-2 text-sm font-semibold">Required documents</p><div className="flex flex-wrap gap-2">{program.requiredDocuments.length ? program.requiredDocuments.map((d) => <Badge key={d} tone="slate">{d}</Badge>) : <span className="text-sm text-slate-500">No documents listed.</span>}</div></div>
          <div><p className="mb-2 text-sm font-semibold">Highlights</p><div className="flex flex-wrap gap-2">{program.tags.length ? program.tags.map((t) => <Badge key={t} tone="brand">{t}</Badge>) : <span className="text-sm text-slate-500">No tags.</span>}</div></div>
        </div>
        <div className="flex flex-col justify-end gap-2 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
          <p className="text-xs text-slate-500">Program analytics</p>
          <p className="text-sm">See application volume, students, agencies, and intake trends.</p>
          <Link href={`/programs/${program.id}/analytics`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">More Details</Link>
        </div>
      </div>
    </Dialog>
  </>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-medium capitalize">{value}</p></div>; }
