import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { canAccessStudent, canAccessStudentDocuments, canManageExistingUser, creatableRoles } from "@/lib/permissions";
import { profileCompleteness } from "@/lib/queries";
import { ShortlistBuilder } from "@/components/shortlist-builder";
import { MessageForm } from "@/components/message-form";
import { UserRoleEditor } from "@/components/user-role-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName, humanize } from "@/lib/utils";
import { roleOptionLabel } from "@/lib/constants";

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
      assignedCounselor: { select: { id: true, role: true, firstName: true, lastName: true, email: true } },
      createdBy: { select: { id: true, role: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!student) {
    return <Card><CardContent className="py-12 text-center text-ink-muted">Account not found.</CardContent></Card>;
  }

  const canView = student.role === "STUDENT"
    ? await canAccessStudent(user, student)
    : student.id === user.id || await canManageExistingUser(user, student);
  if (!canView) redirect("/users");

  const managedStudents = student.role === "COUNSELOR"
    ? await prisma.user.findMany({
        where: user.role === "AGENCY"
          ? { role: "STUDENT", createdById: user.id, assignedCounselorId: student.id }
          : user.role === "COUNSELOR"
            ? { role: "STUDENT", assignedCounselorId: student.id }
            : { role: "STUDENT", OR: [{ assignedCounselorId: student.id }, { createdById: student.id }] },
        select: { id: true, firstName: true, lastName: true, email: true, status: true, country: true, createdAt: true },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      })
    : [];

  const canViewDocuments = await canAccessStudentDocuments(user, student);
  const allowedRoles = creatableRoles(user.role);
  const studentManager = student.assignedCounselor ?? student.createdBy;

  const shortlist = student.shortlists[0];
  const shortlistItems = shortlist?.items ?? [];

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{student.role === "STUDENT" ? fullName(student) : `${fullName(student)} — ${student.role === "COUNSELOR" ? "Consultant" : roleOptionLabel(student.role)}`}</h1>
        <p className="text-sm text-ink-muted">
          {student.email} · {student.country ?? "—"} · {student.role.replace(/_/g, " ")} · profile {profileCompleteness(student)}% complete
        </p>
        <p className="break-all text-xs text-ink-muted">{student.role === "STUDENT" ? "Student" : roleOptionLabel(student.role)} ID {student.id}</p>
        <div className="mt-3 flex flex-wrap gap-2">{user.role === "SUPER_ADMIN" && student.role !== "SUPER_ADMIN" && <UserRoleEditor userId={student.id} role={student.role} allowedRoles={allowedRoles} />}{student.phone && <a href={`https://wa.me/${student.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-lg border border-emerald-300 px-3 text-xs font-medium text-emerald-700 hover:bg-emerald-50">WhatsApp</a>}{(user.role === "SUPER_ADMIN" || user.role === "MANAGER") && student.role === "STUDENT" && <a href={`/users/${student.id}/analytics`} className="inline-flex h-8 items-center rounded-lg bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700">More Details</a>}</div>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {student.role === "STUDENT" && (
            <Card>
              <CardHeader><CardTitle>Student manager</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {studentManager ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-canvas-subtle/60 p-4 dark:border-navy-700 dark:bg-navy-800/50">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{student.assignedCounselor ? "Managed by" : "Account owner"}</p>
                      {studentManager.role === "SUPER_ADMIN" && user.role !== "SUPER_ADMIN" ? (
                        <p className="mt-1 font-semibold">{fullName(studentManager)} · Admin</p>
                      ) : (
                        <Link href={`/users/${studentManager.id}`} className="mt-1 inline-flex min-h-7 items-center font-semibold text-brand-700 hover:underline dark:text-brand-300">{fullName(studentManager)} · {studentManager.role === "SUPER_ADMIN" ? "Admin" : roleOptionLabel(studentManager.role)}</Link>
                      )}
                      <p className="break-all text-sm text-ink-muted">{studentManager.email}</p>
                    </div>
                    <Badge tone={studentManager.role === "SUPER_ADMIN" || studentManager.role === "AGENCY" ? "brand" : "slate"}>{studentManager.role === "SUPER_ADMIN" ? "Admin managed" : studentManager.role === "AGENCY" ? "Agency managed" : "Consultant managed"}</Badge>
                  </div>
                ) : (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">No consultant or admin is assigned to this student yet.</p>
                )}
                {student.createdBy && student.createdBy.id !== student.assignedCounselorId && <p className="text-sm text-ink-muted">Account created by <span className="font-medium text-ink dark:text-white">{fullName(student.createdBy)}</span> · {roleOptionLabel(student.createdBy.role)}</p>}
              </CardContent>
            </Card>
          )}

          {student.role === "COUNSELOR" && (
            <Card>
              <CardHeader><CardTitle>Students managed by this consultant <span className="text-sm font-normal text-ink-muted">({managedStudents.length})</span></CardTitle></CardHeader>
              <CardContent>
                {managedStudents.length === 0 ? (
                  <p className="text-sm text-ink-muted">No connected students yet.</p>
                ) : (
                  <ul className="divide-y divide-line dark:divide-navy-700">
                    {managedStudents.map((managedStudent) => (
                      <li key={managedStudent.id}>
                        <Link href={`/users/${managedStudent.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-3 py-3 hover:text-brand-700 dark:hover:text-brand-300">
                          <span className="min-w-0">
                            <span className="block font-semibold">{fullName(managedStudent)}</span>
                            <span className="block break-all text-xs text-ink-muted">{managedStudent.email}{managedStudent.country ? ` · ${managedStudent.country}` : ""}</span>
                            <span className="block break-all text-[11px] text-ink-muted">Student ID {managedStudent.id}</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2"><Badge tone={managedStudent.status === "active" ? "green" : "amber"}>{humanize(managedStudent.status)}</Badge><span className="text-xs font-medium">View profile →</span></span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {student.role === "STUDENT" && <>
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

          </>}
        </div>

        <div className="min-w-0 space-y-6">
          <Card><CardHeader><CardTitle>Contact & account</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><Info label="Phone" value={student.phone ?? "—"} /><Info label="Country" value={student.country ?? "—"} /><Info label="Company" value={student.companyName ?? "—"} /><Info label="Status" value={student.status} /></CardContent></Card>
          {student.role === "STUDENT" && <Card>
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
          </Card>}

          {student.role === "STUDENT" || student.role === "COUNSELOR" ? <Card>
            <CardHeader><CardTitle>Message {student.role === "STUDENT" ? "student" : "consultant"}</CardTitle></CardHeader>
            <CardContent>
              <MessageForm recipientId={student.id} />
            </CardContent>
          </Card> : null}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-ink-muted">{label}</span><span className="text-right font-medium">{value}</span></div>; }
