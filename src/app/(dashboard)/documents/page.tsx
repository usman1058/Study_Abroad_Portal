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
        <div>
          <h1 className="text-2xl font-bold">My documents</h1>
          <p className="text-sm text-ink-muted">
            Upload passports, transcripts and test results here. {pending} pending · {rejected} rejected · {documents.length} total.
          </p>
        </div>

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

        <nav aria-label="Filter my documents" className="flex flex-wrap gap-2">
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
                "inline-flex min-h-8 items-center rounded-full border px-3 text-sm font-medium " +
                (docsFilter === filter.value
                  ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                  : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:hover:bg-navy-800")
              }
            >
              {filter.label}
            </Link>
          ))}
        </nav>

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
                        {document.status !== "VERIFIED" && (
                          <ReuploadDocument
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
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-ink-muted">
          {scopeLabel}. {pendingCount} pending.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Document filter">
        <Link
          href="/documents"
          aria-current={docsFilter === "all" ? "page" : undefined}
          className={
            "inline-flex min-h-6 items-center rounded-full border px-3 py-1 text-sm font-medium " +
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
              "inline-flex min-h-6 items-center rounded-full border px-3 py-1 text-sm font-medium " +
              (docsFilter === status
                ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:text-slate-300 dark:hover:bg-navy-800")
            }
          >
            {status === "pending" ? "Pending" : status === "verified" ? "Verified" : "Rejected"}
          </Link>
        ))}
      </div>

      {(user.role === "SUPER_ADMIN" || user.role === "MANAGER") && (
        <PartnerDocumentReview agencies={await prisma.user.findMany({
          where: { role: "AGENCY", status: "pending", partnerDocuments: { some: {} } },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            companyName: true,
            partnerDocuments: {
              orderBy: { uploadedAt: "asc" },
              select: { id: true, type: true, originalName: true, status: true, uploadedAt: true },
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
        <Card key={student.id}>
          <CardHeader>
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
        <Card key={agency.id}>
          <CardHeader>
            <CardTitle>{agency.companyName || fullName(agency)}<span className="ml-2 text-xs font-normal text-ink-muted">{agency.partnerDocuments.filter((document) => document.status === "VERIFIED").length}/{agency.partnerDocuments.length} verified</span></CardTitle>
            <p className="text-xs text-ink-muted">{fullName(agency)} · {agency.email} · ID {agency.id}</p>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-line dark:divide-navy-700">
              {agency.partnerDocuments.map((document) => (
                <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{humanize(document.type)}</p>
                    <p className="truncate text-xs text-ink-muted">{document.originalName} · uploaded {formatDate(document.uploadedAt)}</p>
                    <a href={`/api/partner-documents/${document.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center text-xs text-brand-600 hover:underline">Open file</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={document.status === "VERIFIED" ? "green" : document.status === "REJECTED" ? "red" : "amber"}>{humanize(document.status)}</Badge>
                    {document.status === "PENDING" && <VerifyPartnerDocument documentId={document.id} />}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
