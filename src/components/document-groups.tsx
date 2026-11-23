"use client";

import { useMemo, useState } from "react";
import { VerifyDocument } from "@/components/verify-document";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName, humanize } from "@/lib/utils";

type DocumentRow = {
  id: string;
  type: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  rejectionReason: string | null;
  expiresAt: Date | null;
  uploadedAt: Date;
  application: { program: { name: string } } | null;
};
type StudentRow = {
  id: string;
  firstName: string;
  lastName: string;
  documents: DocumentRow[];
  assignedCounselor?: { firstName: string; lastName: string } | null;
};

export function DocumentGroups({ title, students, showCounselor = false, onlyStatus = "all", focusDocumentId = "" }: { title: string; students: StudentRow[]; showCounselor?: boolean; onlyStatus?: string; focusDocumentId?: string }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const filtered = useMemo(() => students.map((student) => ({
    ...student,
    documents: [...student.documents].filter((doc) => (onlyStatus === "all" || doc.status.toLowerCase() === onlyStatus) && (!focusDocumentId || doc.id === focusDocumentId)).sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING")),
  })).filter((student) => student.documents.length > 0 && (!query.trim() || `${fullName(student)} ${student.id} ${student.documents.map((doc) => doc.type).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()))), [students, onlyStatus, query, focusDocumentId]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * pageSize, current * pageSize);

  return <section className="space-y-3">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold">{title}</h2><p className="text-sm text-ink-muted">{filtered.length} student group{filtered.length === 1 ? "" : "s"} · select a student to open their documents.</p></div>
      <label className="block min-w-56 flex-1 sm:max-w-sm"><span className="sr-only">Search students and document types</span><input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search student, ID, or document…" className="min-h-10 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:bg-navy-900" /></label>
    </div>
    {rows.length === 0 ? <Card><CardContent className="py-8 text-center text-sm text-ink-muted">No student documents match your search and filters.</CardContent></Card> : <div className="space-y-2">{rows.map((student) => <details key={student.id} open={Boolean(focusDocumentId)} className="group rounded-xl border border-line bg-white shadow-sm open:border-brand-300 dark:border-navy-700 dark:bg-navy-900">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"><span className="min-w-0"><span className="block font-semibold">{fullName(student)}</span><span className="mt-0.5 block text-xs text-ink-muted">ID {student.id.slice(-8).toUpperCase()} · {student.documents.length} document{student.documents.length === 1 ? "" : "s"}{showCounselor && student.assignedCounselor ? ` · ${fullName(student.assignedCounselor)}` : ""}</span></span><span className="flex shrink-0 items-center gap-2 text-xs text-ink-muted"><span>{student.documents.filter((doc) => doc.status === "VERIFIED").length} verified</span><span aria-hidden="true" className="transition group-open:rotate-180">⌄</span></span></summary>
      <ul className="divide-y divide-line border-t border-line px-4 dark:divide-navy-700 dark:border-navy-700">{student.documents.map((document) => <li key={document.id} id={`document-${document.id}`} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${document.id === focusDocumentId ? "rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20" : ""}`}><div className="min-w-0"><p className="font-medium">{humanize(document.type)}</p><p className="text-xs text-ink-muted">{document.application ? `For ${document.application.program.name}` : "General"} · uploaded {formatDate(document.uploadedAt)}{document.expiresAt ? ` · expires ${formatDate(document.expiresAt)}` : ""}</p>{document.rejectionReason && <p className="text-xs text-red-600">Reason: {document.rejectionReason}</p>}<a href={`/api/documents/${document.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-8 items-center text-xs font-medium text-brand-600 hover:underline">Open file</a></div><div className="flex items-center gap-2"><Badge tone={document.status === "VERIFIED" ? "green" : document.status === "REJECTED" ? "red" : "amber"}>{humanize(document.status)}</Badge>{document.status !== "VERIFIED" && <VerifyDocument documentId={document.id} />}</div></li>)}</ul>
    </details>)}</div>}
    {pages > 1 && <nav aria-label="Student document pages" className="flex items-center justify-between gap-2"><span className="text-sm text-ink-muted">Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, filtered.length)} of {filtered.length} students</span><div className="flex gap-2"><button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="min-h-9 rounded-lg border border-line-strong px-3 text-sm disabled:opacity-40">Previous</button><span className="self-center text-sm">Page {current} of {pages}</span><button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="min-h-9 rounded-lg border border-line-strong px-3 text-sm disabled:opacity-40">Next</button></div></nav>}
  </section>;
}
