import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canAccessStudent, canAccessStudentDocuments } from "@/lib/permissions";
import { ApplicationStageForm } from "@/components/application-stage-form";
import { VerifyDocument } from "@/components/verify-document";
import { MessageForm } from "@/components/message-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, toNum, fullName, humanize } from "@/lib/utils";
import { APPLICATION_STAGES, DOCUMENT_STATUS_LABELS, programLevelLabel } from "@/lib/constants";
import type { ApplicationStage, DocumentStatus } from "@/generated/prisma/client";
import { hasVerifiedRequiredDocuments } from "@/lib/application-stages";
import { FeeDisplay } from "@/components/currency";

export const metadata = { title: "Application Detail" };

type PageProps = { params: Promise<{ id: string }> };

const DOC_TONE: Record<DocumentStatus, "green" | "red" | "amber"> = {
  VERIFIED: "green",
  REJECTED: "red",
  PENDING: "amber",
};

const STAGE_TONE: Record<string, "green" | "brand" | "red" | "slate"> = {
  ENROLLED: "green",
  OFFER: "green",
  DEPOSIT_PAID: "green",
  VISA: "brand",
  UNDER_REVIEW: "brand",
  SUBMITTED: "brand",
  REJECTED: "red",
  WITHDRAWN: "red",
};

function stageLabel(stage: ApplicationStage): string {
  return APPLICATION_STAGES.find((item) => item.value === stage)?.label ?? humanize(stage);
}

export default async function ApplicationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      student: true,
      program: { include: { university: true } },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });

  // Unknown and out-of-scope ids answer the same 404: a counselor or agency
  // must not be able to probe which applications exist.
  if (!application || !(await canAccessStudent(user, application.student))) notFound();

  const canViewDocuments = await canAccessStudentDocuments(user, application.student);
  const visibleDocuments = canViewDocuments ? application.documents : [];
  const verifiedDocs = visibleDocuments.filter((d) => d.status === "VERIFIED").length;
  const hasPendingVerification = visibleDocuments.some((d) => d.status === "PENDING");
  const documentsReady = hasVerifiedRequiredDocuments(application.documents, application.program.requiredDocuments);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/application" className="inline-flex min-h-8 items-center text-sm text-brand-600 hover:underline">
          ← Applications
        </Link>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {/* The student is the subject of this page, so their name is the heading. */}
            <h1 className="text-2xl font-bold break-words">{fullName(application.student)}</h1>
            <p className="text-sm text-ink-muted break-words">
              {application.program.name} · {application.program.university.name}
            </p>
            <p className="break-all text-xs text-ink-muted">Application ID {application.id} · Student ID {application.student.id}</p>
            <p className="mt-1 text-xs text-ink-muted">
              Created {formatDate(application.createdAt)} · Updated {formatDate(application.updatedAt)} ·{" "}
              <Link href={`/users/${application.student.id}`} className="inline-flex min-h-6 items-center text-brand-600 hover:underline">
                View student record
              </Link>
            </p>
          </div>
          <Badge tone={STAGE_TONE[application.stage] ?? "slate"}>{stageLabel(application.stage)}</Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationStageForm
                applicationId={application.id}
                stage={application.stage}
                visaStage={application.visaStage}
                visaRequired={application.program.visaRequired}
                documentsReady={documentsReady}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Documents
                <span className="ml-2 text-xs font-normal text-ink-muted">
                  {canViewDocuments ? `${verifiedDocs} of ${visibleDocuments.length} verified` : "Restricted"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {visibleDocuments.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  {canViewDocuments
                    ? "No documents uploaded for this application."
                    : "Documents are restricted to the student’s assigned counselor or owner."}
                </p>
              ) : (
                <ul className="divide-y divide-line dark:divide-navy-700">
                  {visibleDocuments.map((document) => (
                    <li
                      key={document.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{humanize(document.type)}</p>
                        <p className="text-xs text-ink-muted">
                          Uploaded {formatDate(document.uploadedAt)}
                          {document.rejectionReason && (
                            <span className="text-red-700 dark:text-red-300"> · {document.rejectionReason}</span>
                          )}
                        </p>
                        <a
                          href={`/api/documents/${document.id}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${humanize(document.type)} file (opens in a new tab)`}
                          className="mt-1 inline-flex min-h-8 items-center text-sm font-medium text-brand-600 hover:underline"
                        >
                          Open file<span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Badge tone={DOC_TONE[document.status]}>{DOCUMENT_STATUS_LABELS[document.status]}</Badge>
                        {document.status !== "VERIFIED" && <VerifyDocument documentId={document.id} />}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {hasPendingVerification && (
                <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
                  Applications can only progress once all required documents are verified.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Program details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <dl className="space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">University</dt>
                  <dd className="text-right">{application.program.university.name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Level</dt>
                  <dd className="text-right">{programLevelLabel(application.program.level)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Field</dt>
                  <dd className="text-right">{application.program.field}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Tuition</dt>
                  <dd className="text-right"><FeeDisplay amount={toNum(application.program.tuitionFee)} /></dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-muted">Visa required</dt>
                  <dd className="text-right">{application.program.visaRequired ? "Yes" : "No"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Message student</CardTitle>
            </CardHeader>
            <CardContent>
              <MessageForm recipientId={application.studentId} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
