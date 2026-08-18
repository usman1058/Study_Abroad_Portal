import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canAccessStudent } from "@/lib/permissions";
import { ApplicationStageForm } from "@/components/application-stage-form";
import { VerifyDocument } from "@/components/verify-document";
import { MessageForm } from "@/components/message-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, toNum, fullName } from "@/lib/utils";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import type { DocumentStatus } from "@/generated/prisma/client";

export const metadata = { title: "Application Detail" };

type PageProps = { params: Promise<{ id: string }> };

const DOC_TONE: Record<DocumentStatus, "green" | "red" | "amber"> = {
  VERIFIED: "green",
  REJECTED: "red",
  PENDING: "amber",
};

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

  if (!application) {
    return <Card><CardContent className="py-12 text-center text-slate-500">Application not found.</CardContent></Card>;
  }

  const allowed = await canAccessStudent(user, application.student);
  if (!allowed) redirect("/application");

  const verifiedDocs = application.documents.filter((d) => d.status === "VERIFIED").length;
  const hasPendingVerification = application.documents.some((d) => d.status === "PENDING");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/application" className="text-sm text-brand-600 hover:underline">← Applications</Link>
          <h1 className="mt-1 text-2xl font-bold">{application.program.name}</h1>
          <p className="text-sm text-slate-500">
            {application.program.university.name} · Student:{" "}
            <Link href={`/users/${application.student.id}`} className="hover:underline">
              {fullName(application.student)}
            </Link>
          </p>
        </div>
        <Badge tone={application.stage === "REJECTED" || application.stage === "WITHDRAWN" ? "red" : application.stage === "ENROLLED" || application.stage === "OFFER" ? "green" : "brand"}>
          {application.stage.replace(/_/g, " ")}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
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
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                Documents
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {verifiedDocs}/{application.documents.length} verified
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {application.documents.length === 0 ? (
                <p className="text-sm text-slate-500">No documents uploaded for this application.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {application.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{d.type}</p>
                        <p className="truncate text-xs text-slate-500">
                          Uploaded {formatDate(d.uploadedAt)}
                          {d.rejectionReason && <span className="text-red-600"> · {d.rejectionReason}</span>}
                        </p>
                        <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                          Open file
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={DOC_TONE[d.status]}>{DOCUMENT_STATUS_LABELS[d.status]}</Badge>
                        {d.status !== "VERIFIED" && <VerifyDocument documentId={d.id} />}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {hasPendingVerification && (
                <p className="mt-3 text-xs text-amber-600">
                  Applications can only progress once all required documents are verified.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Program details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">University</span><span>{application.program.university.name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Level</span><span className="capitalize">{application.program.level}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Field</span><span>{application.program.field}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Tuition</span><span>{formatCurrency(toNum(application.program.tuitionFee))}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Visa required</span><span>{application.program.visaRequired ? "Yes" : "No"}</span></div>
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