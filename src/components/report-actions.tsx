"use client";

import { Download, FileText, Printer } from "lucide-react";

export function ReportActions({ period = "30", expanded = false }: { period?: string; expanded?: boolean }) {
  const datasets = [
    ["applications", "Applications"],
    ["students", "Students"],
    ["transactions", "Transactions"],
    ["enrollments", "Course enrollments"],
  ] as const;
  const linkClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-line-strong px-3 text-sm font-semibold text-ink transition hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-navy-700 dark:hover:bg-navy-800";
  return <div className="flex flex-wrap gap-2 print:hidden">
    {expanded ? datasets.map(([dataset, label]) => <a key={dataset} href={`/api/reports/export?period=${encodeURIComponent(period)}&dataset=${dataset}`} className={linkClass}><Download aria-hidden className="h-4 w-4" />{label} CSV</a>) : <a href={`/api/reports/export?period=${encodeURIComponent(period)}&dataset=applications`} className={linkClass}><Download aria-hidden className="h-4 w-4" />Download CSV</a>}
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"><Printer aria-hidden className="h-4 w-4" />Save dashboard as PDF</button>
  </div>;
}
