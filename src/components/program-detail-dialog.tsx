"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeeDisplay } from "@/components/currency";
import { formatDate } from "@/lib/utils";
import { programLevelLabel } from "@/lib/constants";

type Program = {
  id: string;
  slug?: string | null;
  name: string;
  level: string;
  field: string;
  location?: string | null;
  tuitionFee: number | string;
  applicationFee?: number | string | null;
  visaRequired: boolean;
  commissionRate?: number | string;
  intakeDates: (string | Date)[];
  requiredDocuments: string[];
  tags: string[];
  university?: {
    id: string;
    name: string;
    country: string;
    city?: string | null;
    logoUrl?: string | null;
  } | null;
};

export function ProgramDetailDialog({ program }: { program: Program }) {
  const [open, setOpen] = useState(false);
  const nextIntake = program.intakeDates.map((d) => new Date(d)).sort((a, b) => a.getTime() - b.getTime())[0];
  // The catalogue resolves either a slug or an id, but canonical links should
  // use the slug so URLs stay stable if a record is reseeded with a new id.
  const programHref = `/scholarships/${program.slug ?? program.id}`;
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`View details for ${program.name}`}
      >
        <ExternalLink aria-hidden className="h-3.5 w-3.5" /> View details
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={program.name} wide>
        <div className="grid gap-6 md:grid-cols-[1fr_220px]">
          <div className="min-w-0 space-y-5">
            <div>
              <p className="text-sm font-medium text-brand-600">{program.university?.name ?? "University"}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-ink-muted">
                <MapPin aria-hidden className="h-4 w-4" />{" "}
                {program.location || program.university?.city || program.university?.country || "Location not set"}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Info label="Level" value={programLevelLabel(program.level)} />
              <Info label="Field" value={program.field || "—"} />
              <Info label="Tuition" value={<FeeDisplay amount={Number(program.tuitionFee)} />} />
              <Info
                label="Application fee"
                value={program.applicationFee == null ? "—" : <FeeDisplay amount={Number(program.applicationFee)} />}
              />
              <Info label="Next intake" value={nextIntake ? formatDate(nextIntake) : "—"} />
              <Info label="Visa required" value={program.visaRequired ? "Yes" : "No"} />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Required documents</p>
              <div className="flex flex-wrap gap-2">
                {program.requiredDocuments.length ? (
                  program.requiredDocuments.map((d) => (
                    <Badge key={d} tone="slate">
                      {d}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-ink-muted">No documents listed.</span>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">Highlights</p>
              <div className="flex flex-wrap gap-2">
                {program.tags.length ? (
                  program.tags.map((t) => (
                    <Badge key={t} tone="brand">
                      {t}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-ink-muted">No tags.</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-end gap-2 rounded-xl bg-canvas p-4 dark:bg-navy-800/60">
            <p className="text-sm font-semibold">Program page</p>
            <p className="text-sm text-ink-muted">
              Open the full page students see, with intakes, fees and required documents.
            </p>
            <Link
              href={programHref}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              View program page
              <ExternalLink aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-line p-3 dark:border-navy-700">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
