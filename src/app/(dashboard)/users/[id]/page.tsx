import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canAccessStudent, canAccessStudentDocuments, creatableRoles } from "@/lib/permissions";
import { profileCompleteness } from "@/lib/queries";
import { ShortlistBuilder } from "@/components/shortlist-builder";
import { MessageForm } from "@/components/message-form";
import { UserRoleEditor } from "@/components/user-role-editor";
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
    return <Card><CardContent className="py-12 text-center text-ink-muted">Student not found.</CardContent></Card>;
  }

  const canView = student.role === "STUDENT" ? await canAccessStudent(user, student) : user.role === "SUPER_ADMIN" || (user.role === "MANAGER" && student.role !== "SUPER_ADMIN");
  if (!canView) redirect("/users");

  const canViewDocuments = await canAccessStudentDocuments(user, student);
  const allowedRoles = creatableRoles(user.role);

  const shortlist = student.shortlists[0];
  const shortlistItems = shortlist?.items ?? [];

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{student.role === "STUDENT" ? fullName(student) : `${fullName(student)} — ${student.role.replace(/_/g, " ")}`}</h1>
        <p className="text-sm text-ink-muted">
          {student.email} · {student.country ?? "—"} · {student.role.replace(/_/g, " ")} · profile {profileCompleteness(student)}% complete
        </p>
        <p className="break-all text-xs text-ink-muted">Student ID {student.id}</p>
        <div className="mt-3 flex flex-wrap gap-2">{user.role === "SUPER_ADMIN" && student.role !== "SUPER_ADMIN" && <UserRoleEditor userId={student.id} role={student.role} allowedRoles={allowedRoles} />}{student.phone && <a href={`https://wa.me/${student.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg border border-emerald-300 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50">WhatsApp</a>}{(user.role === "SUPER_ADMIN" || user.role === "MANAGER") && student.role === "STUDENT" && <a href={`/users/${student.id}/analytics`} className="inline-flex h-8 items-center rounded-lg bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700">More Details</a>}</div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
            <CardContent>
              {student.applications.length === 0 ? (
                <p className="text-sm text-ink-muted">No applications yet.</p>
              ) : (
                <ul className="divide-y divide-line dark:divide-navy-700">
                  {student.applications.map((a) => (
                    <li key={a.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium">{a.program.name}</p>
                        <p className="break-words text-xs text-ink-muted">{a.program.university.name}</p>
                        <p className="break-all text-[11px] text-ink-muted">Application ID {a.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={a.stage === "REJECTED" ? "red" : "brand"}>{a.stage.replace(/_/g, " ")}</Badge>
                        <a href={`/application/${a.id}`} className="inline-flex min-h-6 items-center text-xs text-brand-600 hover:underline">Open</a>
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
              {!canViewDocuments ? (
                <p className="text-sm text-ink-muted">Documents are limited to this student’s assigned counselor or owner.</p>
              ) : student.documents.length === 0 ? (
                <p className="text-sm text-ink-muted">No documents uploaded.</p>
              ) : (
                <ul className="divide-y divide-line dark:divide-navy-700">
                  {student.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between py-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2"><span>{humanize(d.type)}</span>
                      <Badge tone={d.status === "VERIFIED" ? "green" : d.status === "REJECTED" ? "red" : "amber"}>{humanize(d.status)}</Badge></div>
                      <a href={`/api/documents/${d.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center text-brand-600 hover:underline">Open file</a>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card><CardHeader><CardTitle>Contact & account</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><Info label="Phone" value={student.phone ?? "—"} /><Info label="Country" value={student.country ?? "—"} /><Info label="Company" value={student.companyName ?? "—"} /><Info label="Status" value={student.status} /></CardContent></Card>
          <Card>
            <CardHeader><CardTitle>Shortlist (staff-curated)</CardTitle></CardHeader>
            <CardContent>
              <ShortlistBuilder
                studentId={student.id}
                current={shortlistItems.map((it) => ({
                  programId: it.programId,
                  label: `${it.program.university?.name ?? ""} — ${it.program.name}`,
                }))}
              />
              {shortlistItems.length > 0 && (
                <a
                  href={`/api/shortlist/${student.id}/pdf`}
                  target="_blank"
                  className="mt-4 inline-flex min-h-6 items-center text-sm font-medium text-brand-600 hover:underline"
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

function Info({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-ink-muted">{label}</span><span className="text-right font-medium">{value}</span></div>; }
