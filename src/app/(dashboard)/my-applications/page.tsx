import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DraftSubmitButton } from "@/components/draft-submit-button";
import { DeleteButton } from "@/components/delete-button";
import { WithdrawApplicationButton } from "@/components/withdraw-application-button";
import { CopyRecordId } from "@/components/copy-record-id";
import { ResponsiveFilterPanel } from "@/components/responsive-filter-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, humanize } from "@/lib/utils";
import type { ApplicationStage, DocumentStatus } from "@/generated/prisma/client";
import { ReuploadDocument } from "@/components/reupload-document";

export const metadata = { title: "My Applications" };

const TABS = [
  { key: "all", label: "All", matches: (_stage: ApplicationStage, _docsOk: boolean) => true },
  { key: "drafts", label: "Drafts", matches: (stage: ApplicationStage, _docsOk: boolean) => stage === "DRAFT" },
  { key: "waiting", label: "Waiting for approval", matches: (stage: ApplicationStage, _docsOk: boolean) => stage === "SUBMITTED" || stage === "UNDER_REVIEW" },
  { key: "missing-docs", label: "Missing documents", matches: (_stage: ApplicationStage, docsOk: boolean) => !docsOk },
  { key: "offer", label: "Offers", matches: (stage: ApplicationStage, _docsOk: boolean) => stage === "OFFER" || stage === "DEPOSIT_PAID" },
  { key: "visa-enrolled", label: "Visa & enrolled", matches: (stage: ApplicationStage, _docsOk: boolean) => stage === "VISA" || stage === "ENROLLED" },
  { key: "rejected", label: "Closed", matches: (stage: ApplicationStage, _docsOk: boolean) => stage === "REJECTED" || stage === "WITHDRAWN" },
] as const;

type SearchParams = Promise<{ q?: string; tab?: string; submitted?: string; updated?: string }>;

export default async function MyApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/home");
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const tab = TABS.find((item) => item.key === params.tab)?.key ?? "all";
  const applications = await prisma.application.findMany({
    where: { studentId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { program: { include: { university: true } }, documents: true },
  });
  const rows = applications.map((application) => ({
    ...application,
    docsOk: application.documents.length > 0 && application.documents.every((document) => document.status === ("VERIFIED" as DocumentStatus)),
  }));
  const applicationOptions = rows.map((application) => ({
    id: application.id,
    label: `${application.program.university.name} — ${application.program.name} (${application.stage.replace(/_/g, " ").toLowerCase()})`,
  }));
  const rejectedDocuments = rows.flatMap((application) => application.documents
    .filter((document) => document.status === "REJECTED")
    .map((document) => ({ application, document })));
  const visible = rows.filter((application) => TABS.find((item) => item.key === tab)!.matches(application.stage, application.docsOk) && (!q || `${application.id} ${application.program.name} ${application.program.university.name} ${application.stage}`.toLowerCase().includes(q.toLowerCase())));
  const tabUrl = (key: string) => `/my-applications?${new URLSearchParams({ tab: key, ...(q ? { q } : {}) })}`;

  return <div className="space-y-6">
    <header className="rounded-2xl bg-gradient-to-r from-navy-900 to-brand-700 p-6 text-white shadow-sm sm:p-8"><p className="text-sm font-medium text-blue-100">Application workspace</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">My applications</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">Review every application, filter by progress, and continue drafts that are still in progress.</p><Link href="/apply" className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50">Start an application</Link></header>
    <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><p className="text-xs text-ink-muted">Total applications</p><p className="mt-1 text-2xl font-bold">{rows.length}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-ink-muted">In progress</p><p className="mt-1 text-2xl font-bold">{rows.filter((application) => ["SUBMITTED", "UNDER_REVIEW", "VISA"].includes(application.stage)).length}</p></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs text-ink-muted">Offers</p><p className="mt-1 text-2xl font-bold">{rows.filter((application) => ["OFFER", "DEPOSIT_PAID", "ENROLLED"].includes(application.stage)).length}</p></CardContent></Card></div>
    {params.submitted && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">Application submitted. You can track its progress below.</p>}
    {params.updated && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">Application updated. Changes are saved and sent for review.</p>}
    {rejectedDocuments.length > 0 && <section aria-label="Rejected application documents" className="space-y-3"><div><h2 className="text-lg font-semibold">Documents to replace</h2><p className="text-sm text-ink-muted">Review each rejection reason, upload a corrected file, and it will return to your counselor for review.</p></div><Card><CardContent className="divide-y divide-line p-0 dark:divide-navy-700">{rejectedDocuments.map(({ application, document }) => <div key={document.id} className="flex flex-wrap items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="font-semibold">{humanize(document.type)}</p><Link href={`#application-${application.id}`} className="mt-0.5 inline-flex min-h-6 text-sm text-brand-600 hover:underline">{application.program.university.name} · {application.program.name}</Link><p className="mt-1 text-sm text-red-700 dark:text-red-300"><span className="font-medium">Reason:</span> {document.rejectionReason || "Please upload a clearer or current copy."}</p></div><ReuploadDocument documentId={document.id} type={document.type} applicationId={application.id} applications={applicationOptions} /></div>)}</CardContent></Card></section>}
    <ResponsiveFilterPanel title="Application status" activeCount={tab === "all" ? 0 : 1}><nav aria-label="Filter applications by stage" className="flex flex-nowrap gap-2 overflow-x-auto pb-1">{TABS.map((item) => <Link key={item.key} href={tabUrl(item.key)} aria-current={tab === item.key ? "page" : undefined} className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-sm font-medium ${tab === item.key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line-strong text-ink-muted hover:bg-canvas"}`}>{item.label}<span className="ml-1 opacity-70">({rows.filter((application) => item.matches(application.stage, application.docsOk)).length})</span></Link>)}</nav></ResponsiveFilterPanel>
    <form action="/my-applications" method="get" role="search" className="flex gap-2 rounded-xl border border-line bg-white p-3 dark:border-navy-700 dark:bg-navy-900"><input type="hidden" name="tab" value={tab} /><label htmlFor="application-search" className="sr-only">Search by application ID, program, university, or stage</label><input id="application-search" name="q" type="search" defaultValue={q} placeholder="Search ID, program, university, or stage…" className="min-h-10 min-w-0 flex-1 rounded-lg border border-line-strong bg-transparent px-3 text-sm" /><button className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">Search</button></form>
    {visible.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-ink-muted">No applications match this view. <Link href="/apply" className="font-semibold text-brand-700 underline">Start an application</Link></CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2">{visible.map((application) => {
      const canEdit = ["DRAFT", "SUBMITTED", "UNDER_REVIEW"].includes(application.stage);
      const canWithdraw = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER", "DEPOSIT_PAID", "VISA"].includes(application.stage);
      return <Card key={application.id} id={`application-${application.id}`} className="scroll-mt-24 transition hover:border-brand-300 hover:shadow-md"><CardHeader className="flex flex-row items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="text-base">{application.program.name}</CardTitle><p className="mt-1 text-sm text-ink-muted">{application.program.university.name}</p><div className="mt-2"><CopyRecordId id={application.id} prefix="App" /></div></div><Badge tone={application.stage === "REJECTED" || application.stage === "WITHDRAWN" ? "red" : ["OFFER", "DEPOSIT_PAID", "ENROLLED"].includes(application.stage) ? "green" : application.stage === "DRAFT" ? "slate" : "brand"}>{humanize(application.stage)}</Badge></CardHeader><CardContent><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-ink-muted">Field</dt><dd>{application.program.field}</dd></div><div><dt className="text-xs text-ink-muted">Level</dt><dd>{application.program.level}</dd></div><div><dt className="text-xs text-ink-muted">Last updated</dt><dd>{formatDate(application.updatedAt)}</dd></div><div><dt className="text-xs text-ink-muted">Documents</dt><dd>{application.documents.filter((document) => document.status === "VERIFIED").length}/{application.documents.length} verified</dd></div></dl>{!application.docsOk && application.stage !== "WITHDRAWN" && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Some documents are missing or still need verification.</p>}<div className="mt-4 flex flex-wrap gap-2">
        {canEdit && <Link href={application.stage === "DRAFT" ? `/apply?draft=${application.id}` : `/apply?edit=${application.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-line-strong px-3 text-sm font-medium">{application.stage === "DRAFT" ? "Edit draft" : "Edit application"}</Link>}
        {application.stage === "DRAFT" && <DraftSubmitButton applicationId={application.id} />}
        {canWithdraw && <WithdrawApplicationButton applicationId={application.id} />}
        <DeleteButton endpoint={`/api/applications/${application.id}`} itemName={application.program.name} confirmText="Permanently delete this application? Any uploaded documents and payment records will remain in your account." label="Delete application" />
      </div></CardContent></Card>;
    })}</div>}
    <p className="text-sm text-ink-muted">Showing {visible.length} of {rows.length} applications.</p>
  </div>;
}
