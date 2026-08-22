import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { UploadDocument } from "@/components/upload-document";
import { DocumentViewer } from "@/components/document-viewer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName, humanize } from "@/lib/utils";
import { DOCUMENT_STATUS_LABELS } from "@/lib/constants";
import type { DocumentStatus } from "@/generated/prisma/client";

export const metadata = { title: "My Documents" };

const TONE: Record<DocumentStatus, "green" | "red" | "amber"> = {
  VERIFIED: "green",
  REJECTED: "red",
  PENDING: "amber",
};

export default async function MyDocumentsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  if (user.role !== "STUDENT") redirect("/home");

  const [documents, applications] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { uploadedAt: "desc" },
      include: {
        application: { include: { program: { include: { university: true } } } },
        verifiedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.application.findMany({
      where: { studentId: user.id },
      include: { program: { include: { university: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Documents</h1>
        <p className="text-sm text-slate-500">Upload documents for verification by our team.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload a document</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDocument
            applications={applications.map((a) => ({ id: a.id, label: `${a.program.university.name} — ${a.program.name}` }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uploaded documents</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No documents uploaded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-4">Type</th>
                    <th className="p-4">Application</th>
                    <th className="p-4">Uploaded</th>
                    <th className="p-4">Expires</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.map((d) => (
                    <tr key={d.id}>
                      <td className="p-4 font-medium">{humanize(d.type)}</td>
                      <td className="p-4 text-slate-500">
                        {d.application ? `${d.application.program.university.name} — ${d.application.program.name}` : "General"}
                      </td>
                      <td className="p-4 text-slate-500">{formatDate(d.uploadedAt)}</td>
                      <td className="p-4 text-slate-500">{d.expiresAt ? formatDate(d.expiresAt) : "—"}</td>
                      <td className="p-4">
                        <Badge tone={TONE[d.status]}>{DOCUMENT_STATUS_LABELS[d.status]}</Badge>
                        {d.status === "REJECTED" && d.rejectionReason && (
                          <p className="mt-1 max-w-[14rem] text-xs text-red-600">{d.rejectionReason}</p>
                        )}
                        {d.status === "VERIFIED" && d.verifiedBy && (
                          <p className="mt-1 text-xs text-slate-400">Verified by {fullName(d.verifiedBy)}</p>
                        )}
                      </td>
                      <td className="p-4">
                        <DocumentViewer fileUrl={d.fileUrl} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}