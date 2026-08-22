import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canAccessStudent } from "@/lib/permissions";
import { VerifyDocument } from "@/components/verify-document";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName, humanize } from "@/lib/utils";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const students = await prisma.user.findMany({
    where: { role: "STUDENT", documents: { some: {} } },
    include: {
      documents: { include: { application: { include: { program: true } } }, orderBy: { uploadedAt: "desc" } },
      applications: { include: { program: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const visible = [];
  for (const s of students) {
    if (await canAccessStudent(user, s)) visible.push(s);
  }

  const pendingCount = visible.reduce((n, s) => n + s.documents.filter((d) => d.status === "PENDING").length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-slate-500">
          Verify and approve student documents. {pendingCount} pending.
        </p>
      </div>

      {visible.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-slate-500">No students with documents.</CardContent></Card>
      ) : (
        visible.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>
                {fullName(s)}
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {s.documents.filter((d) => d.status === "VERIFIED").length}/{s.documents.length} verified
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {s.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{humanize(d.type)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {d.application ? `For ${d.application.program.name}` : "General"} · uploaded {formatDate(d.uploadedAt)}
                        {d.rejectionReason && <span className="text-red-600"> · {d.rejectionReason}</span>}
                        {d.expiresAt && <span> · expires {formatDate(d.expiresAt)}</span>}
                      </p>
                      <a href={d.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 hover:underline">Open file</a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={d.status === "VERIFIED" ? "green" : d.status === "REJECTED" ? "red" : "amber"}>{d.status}</Badge>
                      {d.status !== "VERIFIED" && <VerifyDocument documentId={d.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}