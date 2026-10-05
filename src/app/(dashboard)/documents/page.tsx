import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  directDocumentStudentScopeWhere,
  counselorOversightScopeWhere,
  canAccessStudentDocuments,
} from "@/lib/permissions";
import { VerifyDocument } from "@/components/verify-document";
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
  if (!user || user.role === "STUDENT") redirect("/");

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-slate-500">
          Documents are limited to your counselor/student cases. {pendingCount} pending.
        </p>
      </div>

      <DocumentGroup title="My student documents" students={visibleDirect} />

      {user.role === "MANAGER" && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Counselor activity and documents</h2>
            <p className="text-sm text-slate-500">Cases assigned to counselors you created.</p>
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
    return <Card><CardContent className="py-8 text-center text-sm text-slate-500">No students with documents.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      {students.map((student) => (
        <Card key={student.id}>
          <CardHeader>
            <CardTitle>
              {fullName(student)}
              <span className="ml-2 text-xs font-normal text-slate-500">
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
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {student.documents.map((document) => (
                <li key={document.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{humanize(document.type)}</p>
                    <p className="truncate text-xs text-slate-500">
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
