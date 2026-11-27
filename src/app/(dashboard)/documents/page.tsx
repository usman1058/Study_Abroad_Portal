import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  directDocumentStudentScopeWhere,
  counselorOversightScopeWhere,
  canAccessStudentDocuments,
} from "@/lib/permissions";
import { VerifyDocument } from "@/components/verify-document";
import { UploadDocument } from "@/components/upload-document";
import { ReuploadDocument } from "@/components/reupload-document";
import { VerifyPartnerDocument } from "@/components/verify-partner-document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName, humanize } from "@/lib/utils";
import { DocumentGroups } from "@/components/document-groups";
import { DocumentThumbnail } from "@/components/document-thumbnail";
import { ResponsiveFilterPanel } from "@/components/responsive-filter-panel";

export const metadata = { title: "Documents" };

const STATUS_HELP: Record<"PENDING" | "VERIFIED" | "REJECTED", string> = {
  VERIFIED: "Checked and accepted.",
  PENDING: "Waiting for review.",
  REJECTED: "Needs replacing — see the reason above.",
};

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

const documentInclude = {
  documents: {
    select: {
      id: true,
      type: true,
      status: true,
      rejectionReason: true,
      expiresAt: true,
      uploadedAt: true,
      verifiedBy: { select: { firstName: true, lastName: true } },
      application: { include: { program: true } },
    },
    orderBy: { uploadedAt: "desc" as const },
  },
};

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<{ docs?: string; document?: string }> }) {
  const { docs: rawDocsFilter = "all", document: focusDocumentId = "" } = await searchParams;
  const docsFilter = ["pending", "verified", "rejected"].includes(rawDocsFilter) ? rawDocsFilter : "all";
  const user = await currentUser();
  if (!user) redirect("/");

  // Students get their own document workspace instead of the staff review view.
  if (user.role === "STUDENT") {
    const [documents, applications] = await Promise.all([
      prisma.document.findMany({
        where: { ownerId: user.id },
        orderBy: { uploadedAt: "desc" },
        select: {
          id: true,
          type: true,
          status: true,
          rejectionReason: true,
          expiresAt: true,
          uploadedAt: true,
          applicationId: true,
          application: { select: { program: { select: { name: true } } } },
        },
      }),
      prisma.application.findMany({
        where: { studentId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, stage: true, program: { select: { name: true, university: { select: { name: true } } } } },
      }),
    ]);

    const pending = documents.filter((document) => document.status === "PENDING").length;
    const rejected = documents.filter((document) => document.status === "REJECTED").length;
    const filteredDocuments = documents.filter((document) => (docsFilter === "all" || document.status.toLowerCase() === docsFilter) && (!focusDocumentId || document.id === focusDocumentId));
    const applicationOptions = applications.map((application) => ({
      id: application.id,
      label: `${application.program.university.name} — ${application.program.name} (${application.stage.replace(/_/g, " ").toLowerCase()})`,
    }));

    return (
      <div className="space-y-6">
        <header className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[#142d67] via-[#3547a2] to-[#704cc8] p-5 text-white shadow-lg shadow-indigo-950/10 sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 -z-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-100">Student workspace · Documents</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">My documents</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">Upload passports, transcripts, and test results. Review decisions and replace rejected files here.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">{documents.length} total</span>
            <span className="rounded-full border border-amber-200/30 bg-amber-300/15 px-3 py-1.5">{pending} pending</span>
            <span className="rounded-full border border-rose-200/30 bg-rose-300/15 px-3 py-1.5">{rejected} to replace</span>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Upload a document</CardTitle>
          </CardHeader>
          <CardContent>
            <UploadDocument
              applications={applicationOptions}
            />
          </CardContent>
        </Card>

        <ResponsiveFilterPanel title="Document status" activeCount={docsFilter === "all" ? 0 : 1}>
        <nav aria-label="Filter my documents" className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          {[
            { value: "all", label: "All documents" },
            { value: "pending", label: "Pending" },
            { value: "verified", label: "Verified" },
            { value: "rejected", label: "Rejected" },
          ].map((filter) => (
            <Link
              key={filter.value}
              href={filter.value === "all" ? "/documents" : `/documents?docs=${filter.value}`}
              aria-current={docsFilter === filter.value ? "page" : undefined}
              className={
                "inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-sm font-medium " +
                (docsFilter === filter.value
                  ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                  : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:hover:bg-navy-800")
              }
            >
              {filter.label}
            </Link>
          ))}
        </nav>
        </ResponsiveFilterPanel>

        <Card>
          <CardHeader>
            <CardTitle>Your documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">No documents yet. Upload your passport to get started.</p>
            ) : filteredDocuments.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">No documents match this filter.</p>
            ) : (
              <ul className="divide-y divide-line dark:divide-navy-700">
                {filteredDocuments.map((document) => {
                  const expiry = daysUntil(document.expiresAt);
                  return (
                  <li key={document.id} id={`document-${document.id}`} className={`flex flex-wrap items-center justify-between gap-3 py-3 ${document.id === focusDocumentId ? "rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20" : ""}`}>
                    <DocumentThumbnail href={`/api/documents/${document.id}`} label={humanize(document.type)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{humanize(document.type)}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {document.application ? "For " + document.application.program.name : "General"} · uploaded {formatDate(document.uploadedAt)}
                        {document.expiresAt && <span> · expires {formatDate(document.expiresAt)}</span>}
                      </p>
                      <p className="text-xs text-ink-muted">{STATUS_HELP[document.status]}</p>
                      {expiry !== null && expiry >= 0 && expiry <= 30 && (
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          Expires in {expiry} day{expiry === 1 ? "" : "s"} — replace it before it lapses.
                        </p>
                      )}
                      {expiry !== null && expiry < 0 && (
                        <p className="text-xs font-medium text-red-700 dark:text-red-300">Expired {formatDate(document.expiresAt!)} — upload a current copy.</p>
                      )}
                      {document.rejectionReason && (
                        <p className="text-xs text-red-600">Rejected: {document.rejectionReason}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-3">
                        <a href={"/api/documents/" + document.id} target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center text-xs text-brand-600 hover:underline">
                          Open file
                        </a>
                        {document.status === "REJECTED" && (
                          <ReuploadDocument
                            documentId={document.id}
                            type={document.type}
                            applicationId={document.applicationId}
                            applications={applicationOptions}
                          />
                        )}
                      </div>
                    </div>
                    <Badge tone={document.status === "VERIFIED" ? "green" : document.status === "REJECTED" ? "red" : "amber"}>
                      {humanize(document.status)}
                    </Badge>
                  </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const oversightScope = counselorOversightScopeWhere(user);
  const [directStudents, oversightStudents] = await Promise.all([
    prisma.user.findMany({
      where: { ...directDocumentStudentScopeWhere(user), documents: { some: {} } },
      include: documentInclude,
      orderBy: { createdAt: "desc" },
    }),
    oversightScope
      ? prisma.user.findMany({
          where: { ...oversightScope, documents: { some: {} } },
          include: {
            ...documentInclude,
            assignedCounselor: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const oversightIds = new Set(oversightStudents.map((student) => student.id));
  const visibleDirect = [];
  for (const student of directStudents) {
    if (!oversightIds.has(student.id) && (await canAccessStudentDocuments(user, student))) visibleDirect.push(student);
  }

  const pendingCount = [...visibleDirect, ...oversightStudents].reduce(
    (count, student) => count + student.documents.filter((document) => document.status === "PENDING").length,
    0,
  );

  const scopeLabel =
    user.role === "SUPER_ADMIN"
      ? "All student documents"
      : user.role === "MANAGER"
        ? "Documents for students you manage"
        : user.role === "AGENCY"
          ? "Documents for students you registered"
          : "Documents for students assigned to you";

  return (
    <div className="space-y-6">
      <header className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-[#142d67] via-[#3547a2] to-[#704cc8] p-5 text-white shadow-lg shadow-indigo-950/10 sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 -z-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-100">Document center · {user.role === "SUPER_ADMIN" ? "Admin review" : user.role === "MANAGER" ? "Manager review" : user.role === "AGENCY" ? "Agency workspace" : "Consultant workspace"}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Documents</h1><p className="mt-2 text-sm leading-6 text-blue-50">{scopeLabel}. Review student and partner files in one organized workspace.</p></div><span className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold">{pendingCount} pending review</span></div>
      </header>

      <ResponsiveFilterPanel title="Document status" activeCount={docsFilter === "all" ? 0 : 1}>
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1" role="group" aria-label="Document filter">
        <Link
          href="/documents"
          aria-current={docsFilter === "all" ? "page" : undefined}
          className={
            "inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium " +
            (docsFilter !== "pending"
              ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
              : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:text-slate-300 dark:hover:bg-navy-800")
          }
        >
          All documents
        </Link>
        {(["pending", "verified", "rejected"] as const).map((status) => (
          <Link
            key={status}
            href={`/documents?docs=${status}`}
            aria-current={docsFilter === status ? "page" : undefined}
            className={
              "inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 py-1 text-sm font-medium " +
              (docsFilter === status
                ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:text-slate-300 dark:hover:bg-navy-800")
            }
          >
            {status === "pending" ? "Needs review" : status === "verified" ? "Approved history" : "Rejected"}
          </Link>
        ))}
      </div>
      </ResponsiveFilterPanel>

      {(user.role === "SUPER_ADMIN" || user.role === "MANAGER") && (
        <PartnerDocumentReview agencies={await prisma.user.findMany({
          // Retain verified/rejected files in this review history after portal approval.
          where: { role: "AGENCY", partnerDocuments: { some: {} } },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
            partnerDocuments: {
              orderBy: { uploadedAt: "asc" },
              select: { id: true, type: true, originalName: true, status: true, uploadedAt: true, verifiedBy: { select: { firstName: true, lastName: true } } },
            },
          },
        })} onlyStatus={docsFilter} />
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Student documents</h2>
          <p className="text-sm text-ink-muted">Student files grouped by student and review status.</p>
        </div>
        <DocumentGroups title={user.role === "SUPER_ADMIN" ? "All student documents" : "Student document groups"} students={visibleDirect} onlyStatus={docsFilter} focusDocumentId={focusDocumentId} />
      </section>

      {user.role === "MANAGER" && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Counselor activity and documents</h2>
            <p className="text-sm text-ink-muted">Cases assigned to counselors you created.</p>
          </div>
          <DocumentGroups title="Managed counselor cases" students={oversightStudents} showCounselor onlyStatus={docsFilter} focusDocumentId={focusDocumentId} />
        </section>
      )}
    </div>
  );
}

function DocumentGroup({
  title,
  students,
  showCounselor = false,
  onlyStatus = "all",
}: {
  title: string;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    documents: Array<{
      id: string;
      type: Parameters<typeof humanize>[0];
      status: "PENDING" | "VERIFIED" | "REJECTED";
      rejectionReason: string | null;
      expiresAt: Date | null;
      uploadedAt: Date;
      verifiedBy: { firstName: string; lastName: string } | null;
      application: { program: { name: string } } | null;
    }>;
    assignedCounselor?: { firstName: string; lastName: string } | null;
  }>;
  showCounselor?: boolean;
  onlyStatus?: string;
}) {
  if (students.length === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-ink-muted">No students with documents.</CardContent></Card>;
  }

  const filtered = students
    .map((student) => ({
      ...student,
      documents: [...student.documents]
        .filter((document) => onlyStatus === "all" || document.status.toLowerCase() === onlyStatus)
        // Pending first: those are the only rows with an action.
        .sort((a, b) => Number(b.status === "PENDING") - Number(a.status === "PENDING")),
    }))
    .filter((student) => student.documents.length > 0);

  if (filtered.length === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-ink-muted">No documents match this filter.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {filtered.map((student) => (
        <Card key={student.id} className="overflow-hidden border-line/90 shadow-sm transition hover:border-brand-200 hover:shadow-md dark:border-navy-700">
          <CardHeader className="border-b border-line bg-gradient-to-r from-blue-50/80 via-white to-violet-50/70 py-4 dark:border-navy-700 dark:from-blue-950/30 dark:via-navy-900 dark:to-violet-950/30">
            <CardTitle>
              {fullName(student)}
              <span className="ml-2 text-xs font-normal text-ink-muted">
                {student.documents.filter((document) => document.status === "VERIFIED").length}/{student.documents.length} verified
              </span>
              {showCounselor && student.assignedCounselor && (
                <span className="ml-2 text-xs font-normal text-brand-600">
                  · {fullName(student.assignedCounselor)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line dark:divide-navy-700">
              {student.documents.map((document) => (
                <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <DocumentThumbnail href={`/api/documents/${document.id}`} label={humanize(document.type)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{humanize(document.type)}</p>
                    <p className="truncate text-xs text-ink-muted">
                      {document.application ? "For " + document.application.program.name : "General"} · uploaded {formatDate(document.uploadedAt)}
                      {document.rejectionReason && <span className="text-red-600"> · {document.rejectionReason}</span>}
                      {document.expiresAt && <span> · expires {formatDate(document.expiresAt)}</span>}
                    </p>
                    <a href={"/api/documents/" + document.id} target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center text-xs text-brand-600 hover:underline">Open file</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={document.status === "VERIFIED" ? "green" : document.status === "REJECTED" ? "red" : "amber"}>{humanize(document.status)}</Badge>
                    {document.status !== "VERIFIED" && <VerifyDocument documentId={document.id} />}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PartnerDocumentReview({
  agencies,
  onlyStatus,
}: {
  agencies: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    companyName: string | null;
    partnerDocuments: Array<{
      id: string;
      type: string;
      originalName: string;
      status: "PENDING" | "VERIFIED" | "REJECTED";
      uploadedAt: Date;
      verifiedBy: { firstName: string; lastName: string } | null;
    }>;
  }>;
  onlyStatus: string;
}) {
  const filtered = agencies
    .map((agency) => ({
      ...agency,
      partnerDocuments: agency.partnerDocuments.filter(
        (document) => onlyStatus === "all" || document.status.toLowerCase() === onlyStatus,
      ),
    }))
    .filter((agency) => agency.partnerDocuments.length > 0);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Partner institution documents</h2>
        <p className="text-sm text-ink-muted">Verify the business registration and supporting files before approving portal access.</p>
      </div>
      {filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-ink-muted">No partner documents match this filter.</CardContent></Card>
      ) : filtered.map((agency) => (
        <details key={agency.id} className="group rounded-xl border border-line bg-white shadow-sm dark:border-navy-700 dark:bg-navy-900">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500">
            <span className="min-w-0"><span className="block font-semibold">{agency.companyName || fullName(agency)}</span><span className="block truncate text-xs text-ink-muted">{agency.partnerDocuments.length} file{agency.partnerDocuments.length === 1 ? "" : "s"} · {agency.partnerDocuments.filter((document) => document.status === "PENDING").length} pending review</span></span>
            <span aria-hidden="true" className="shrink-0 text-ink-muted transition group-open:rotate-180">⌄</span>
          </summary>
          <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>{agency.companyName || fullName(agency)}<span className="ml-2 text-xs font-normal text-ink-muted">{agency.partnerDocuments.filter((document) => document.status === "VERIFIED").length}/{agency.partnerDocuments.length} approved</span></CardTitle>
            <p className="text-xs text-ink-muted">{fullName(agency)} · {agency.email} · ID {agency.id}</p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line dark:divide-navy-700">
              {agency.partnerDocuments.map((document) => (
                <li key={document.id} className="flex items-center gap-3 py-2.5">
                  <DocumentThumbnail href={`/api/partner-documents/${document.id}`} label={document.originalName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm font-medium">{humanize(document.type)}</p><Badge tone={document.status === "VERIFIED" ? "green" : document.status === "REJECTED" ? "red" : "amber"}>{humanize(document.status)}</Badge></div>
                    <p className="truncate text-xs text-ink-muted" title={document.originalName}>{document.originalName} · {formatDate(document.uploadedAt)}</p>
                    {document.status === "VERIFIED" && document.verifiedBy && <p className="text-xs text-emerald-700 dark:text-emerald-300">Approved by {fullName(document.verifiedBy)}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {document.status === "PENDING" && <VerifyPartnerDocument documentId={document.id} />}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
          </Card>
        </details>
      ))}
    </section>
  );
}
