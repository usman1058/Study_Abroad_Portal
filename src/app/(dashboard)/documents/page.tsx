import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  directDocumentStudentScopeWhere,
  counselorOversightScopeWhere,
  canAccessStudentDocuments,
} from "@/lib/permissions";
import { VerifyDocument } from "@/components/verify-document";
import { UploadDocument } from "@/components/upload-document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName, humanize } from "@/lib/utils";

export const metadata = { title: "Documents" };

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

export default async function DocumentsPage() {
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
              applications={applications.map((application) => ({
                id: application.id,
                label: `${application.program.university.name} — ${application.program.name} (${application.stage.replace(/_/g, " ").toLowerCase()})`,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your documents</CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-muted">No documents yet. Upload your passport to get started.</p>
            ) : (
              <ul className="divide-y divide-line dark:divide-navy-700">
                {documents.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{humanize(document.type)}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {document.application ? "For " + document.application.program.name : "General"} · uploaded {formatDate(document.uploadedAt)}
                        {document.expiresAt && <span> · expires {formatDate(document.expiresAt)}</span>}
                      </p>
                      {document.rejectionReason && (
                        <p className="text-xs text-red-600">Rejected: {document.rejectionReason}</p>
                      )}
                      <a href={"/api/documents/" + document.id} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">
                        Open file
                      </a>
                    </div>
                    <Badge tone={document.status === "VERIFIED" ? "green" : document.status === "REJECTED" ? "red" : "amber"}>
                      {humanize(document.status)}
                    </Badge>
                  </li>
                ))}
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

      <DocumentGroup title={user.role === "SUPER_ADMIN" ? "All students" : "Students in your scope"} students={visibleDirect} />

      {user.role === "MANAGER" && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Counselor activity and documents</h2>
            <p className="text-sm text-ink-muted">Cases assigned to counselors you created.</p>
          </div>
          <DocumentGroup title="Managed counselor cases" students={oversightStudents} showCounselor />
        </section>
      )}
    </div>
  );
}

function DocumentGroup({
  title,
  students,
  showCounselor = false,
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
}) {
  if (students.length === 0) {
    return <Card><CardContent className="py-8 text-center text-sm text-ink-muted">No students with documents.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {students.map((student) => (
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
                    <a href={"/api/documents/" + document.id} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Open file</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={document.status === "VERIFIED" ? "green" : document.status === "REJECTED" ? "red" : "amber"}>{document.status}</Badge>
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
