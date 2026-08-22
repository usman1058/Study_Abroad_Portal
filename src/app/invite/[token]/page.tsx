import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, fullName } from "@/lib/utils";

export const metadata = { title: "Guest Access" };

type PermissionSet = { sections: string[]; access: Record<string, "view" | "edit"> };

type PageProps = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const link = await prisma.inviteLink.findUnique({
    where: { token },
    include: {
      student: true,
      createdBy: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!link || link.revoked || new Date(link.expiresAt) < new Date()) {
    notFound();
  }

  const permissionSet = (link.permissionSet ?? { sections: [], access: {} }) as PermissionSet;
  const sections = permissionSet.sections ?? [];

  // Log the visit (audit trail)
  logAudit({
    actorId: link.createdById,
    actorType: "guest",
    action: "invite_used",
    entityType: "InviteLink",
    entityId: link.id,
    after: { token, studentId: link.studentId, sections },
  });

  const student = link.student;
  if (!student) notFound();

  const [applications, documents, shortlist, transactions] = await Promise.all([
    sections.includes("applications")
      ? prisma.application.findMany({
          where: { studentId: student.id },
          include: { program: { include: { university: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    sections.includes("documents") ? prisma.document.findMany({ where: { ownerId: student.id }, orderBy: { uploadedAt: "desc" } }) : Promise.resolve([]),
    sections.includes("shortlist")
      ? prisma.shortlist.findUnique({
          where: { studentId: student.id },
          include: { items: { include: { program: { include: { university: true } } }, orderBy: { position: "asc" } } },
        })
      : Promise.resolve(null),
    sections.includes("payments") ? prisma.transaction.findMany({ where: { relatedStudentId: student.id }, orderBy: { date: "desc" } }) : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-slate-500">Guest access granted by your study-abroad agency</p>
        <h1 className="text-2xl font-bold">{student.firstName} {student.lastName}</h1>
        <p className="mt-1 text-sm text-slate-500">Access expires {formatDate(link.expiresAt)}</p>
      </div>

      {sections.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-500">No sections shared via this link.</CardContent></Card>
      ) : (
        <>
          {sections.includes("applications") && (
            <Card>
              <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <p className="text-sm text-slate-500">No applications.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {applications.map((a) => (
                      <li key={a.id} className="flex items-center justify-between py-3 text-sm">
                        <div>
                          <p className="font-medium">{a.program.name}</p>
                          <p className="text-xs text-slate-500">{a.program.university.name}</p>
                        </div>
                        <Badge tone={a.stage === "REJECTED" ? "red" : "brand"}>{a.stage.replace(/_/g, " ")}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {sections.includes("documents") && (
            <Card>
              <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-sm text-slate-500">No documents.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {documents.map((d) => (
                      <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                        <span className="capitalize">{d.type}</span>
                        <Badge tone={d.status === "VERIFIED" ? "green" : "amber"}>{d.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {sections.includes("shortlist") && shortlist && (
            <Card>
              <CardHeader><CardTitle>Shortlist</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {shortlist.items.length === 0 ? (
                    <li className="text-slate-500">Shortlist is empty.</li>
                  ) : (
                    shortlist.items.map((it, i) => (
                      <li key={it.id}>
                        {i + 1}. {it.program.university?.name} — {it.program.name}
                      </li>
                    ))
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          {sections.includes("payments") && (
            <Card>
              <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-sm text-slate-500">No payments.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((t) => (
                      <li key={t.id} className="flex justify-between py-3 text-sm">
                        <span className="capitalize">{t.type.replace(/_/g, " ")}</span>
                        <span className="font-medium">{formatCurrency(t.amount, t.currency)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>Contact your agency</CardTitle></CardHeader>
            <CardContent>
              {link.createdBy ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{fullName(link.createdBy)}</p>
                  <p className="text-slate-500">{link.createdBy.email}</p>
                  {link.createdBy.phone && <p className="text-slate-500">{link.createdBy.phone}</p>}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Your agency contact is no longer available.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}