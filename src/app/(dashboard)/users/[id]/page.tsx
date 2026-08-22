import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canAccessStudent } from "@/lib/permissions";
import { listPrograms, profileCompleteness } from "@/lib/queries";
import { ShortlistBuilder } from "@/components/shortlist-builder";
import { MessageForm } from "@/components/message-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName, humanize } from "@/lib/utils";

export const metadata = { title: "Student" };

type PageProps = { params: Promise<{ id: string }> };

export default async function StudentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const student = await prisma.user.findUnique({
    where: { id },
    include: {
      applications: { include: { program: { include: { university: true } } }, orderBy: { createdAt: "desc" } },
      documents: { orderBy: { uploadedAt: "desc" } },
      shortlists: { include: { items: { include: { program: { include: { university: true } } }, orderBy: { position: "asc" } } } },
    },
  });

  if (!student) {
    return <Card><CardContent className="py-12 text-center text-slate-500">Student not found.</CardContent></Card>;
  }

  if (!(await canAccessStudent(user, student))) redirect("/users");

  const programs = await listPrograms();
  const shortlist = student.shortlists[0];
  const shortlistItems = shortlist?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{fullName(student)}</h1>
        <p className="text-sm text-slate-500">
          {student.email} · {student.country ?? "—"} · profile {profileCompleteness(student)}% complete
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
            <CardContent>
              {student.applications.length === 0 ? (
                <p className="text-sm text-slate-500">No applications yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {student.applications.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium">{a.program.name}</p>
                        <p className="text-xs text-slate-500">{a.program.university.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={a.stage === "REJECTED" ? "red" : "brand"}>{a.stage.replace(/_/g, " ")}</Badge>
                        <a href={`/application/${a.id}`} className="text-xs text-brand-600 hover:underline">Open</a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Documents</CardTitle></CardHeader>
            <CardContent>
              {student.documents.length === 0 ? (
                <p className="text-sm text-slate-500">No documents uploaded.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {student.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                      <span>{humanize(d.type)}</span>
                      <Badge tone={d.status === "VERIFIED" ? "green" : d.status === "REJECTED" ? "red" : "amber"}>{d.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Shortlist (staff-curated)</CardTitle></CardHeader>
            <CardContent>
              <ShortlistBuilder
                studentId={student.id}
                current={shortlistItems.map((it) => ({
                  programId: it.programId,
                  label: `${it.program.university?.name ?? ""} — ${it.program.name}`,
                }))}
                catalog={programs.map((p) => ({ id: p.id, label: `${p.university?.name ?? ""} — ${p.name}` }))}
              />
              {shortlistItems.length > 0 && (
                <a
                  href={`/api/shortlist/${student.id}/pdf`}
                  target="_blank"
                  className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
                >
                  Download shortlist PDF →
                </a>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Message student</CardTitle></CardHeader>
            <CardContent>
              <MessageForm recipientId={student.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}