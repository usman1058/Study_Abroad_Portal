import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listPrograms, listShortCourses } from "@/lib/queries";
import { ShortCourseForm } from "@/components/short-course-form";
import { EnrollButton } from "@/components/enroll-button";
import { DeleteButton } from "@/components/delete-button";
import { FeeDisplay } from "@/components/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, humanize } from "@/lib/utils";
import Link from "next/link";

export const metadata = { title: "Short Courses" };

export default async function ShortCoursesPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const [courses, programs] = await Promise.all([listShortCourses(), listPrograms()]);
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const courseStats = isSuperAdmin ? await prisma.shortCourseEnrollment.groupBy({ by: ["status"], _count: { _all: true } }) : [];
  const enrolledCount = courseStats.filter((s) => s.status === "enrolled" || s.status === "completed").reduce((n, s) => n + s._count._all, 0);
  const pendingCount = courseStats.filter((s) => s.status === "pending_approval" || s.status === "pending_payment").reduce((n, s) => n + s._count._all, 0);

  const myEnrollments =
    user.role === "STUDENT"
      ? await prisma.shortCourseEnrollment.findMany({ where: { studentId: user.id } })
      : [];

  const enrolledMap = new Map(myEnrollments.map((e) => [e.shortCourseId, e.status]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Short Courses</h1>
          <p className="text-sm text-slate-500">
            Language, test-prep, foundation and professional courses.
          </p>
        </div>
        {isSuperAdmin && (
          <ShortCourseForm programs={programs.map((p) => ({ id: p.id, label: `${p.university?.name ?? ""} — ${p.name}` }))} />
        )}
      </div>

      {isSuperAdmin && <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-xs text-slate-500">Active courses</p><p className="mt-1 text-2xl font-bold">{courses.length}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-slate-500">Enrolled students</p><p className="mt-1 text-2xl font-bold">{enrolledCount}</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-xs text-slate-500">Pending applications/payments</p><p className="mt-1 text-2xl font-bold">{pendingCount}</p></CardContent></Card></div>}

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">No short courses yet.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">{c.provider}</p>
                    <h3 className="font-semibold">{c.title}</h3>
                  </div>
                  <Badge tone="brand">{humanize(c.category)}</Badge>
                </div>
                <p className="mb-3 line-clamp-2 text-sm text-slate-500">{c.description || "No description."}</p>
                <dl className="mb-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Duration</dt>
                    <dd>{c.duration}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Delivery</dt>
                    <dd className="capitalize">{c.deliveryMode}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Next start</dt>
                    <dd>
                      {(() => {
                        const nextStart = c.startDates
                          .map((d) => new Date(d))
                          .filter((d) => d.getTime() > Date.now())
                          .sort((a, b) => a.getTime() - b.getTime())[0];
                        return nextStart ? formatDate(nextStart) : "—";
                      })()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Fee</dt>
                    <dd className="font-medium">
                      <FeeDisplay amount={c.fee} />
                    </dd>
                  </div>
                </dl>
                <div className="flex items-center gap-2">
                  <Link href={`/short-courses/${c.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50">More Details</Link>
                  {user.role === "STUDENT" && (
<EnrollButton
  shortCourseId={c.id}
  enrolled={enrolledMap.has(c.id)}
  status={enrolledMap.get(c.id)}
  paymentType={c.paymentType as "FREE" | "PAID" | "OTHER"}
  course={{ fee: c.fee, deliveryMode: c.deliveryMode, classSchedule: c.classSchedule, meetingLink: c.meetingLink, startDates: c.startDates, duration: c.duration }}
/>
                  )}
                  {isSuperAdmin && (
                    <>
                      <ShortCourseForm
                        programs={programs.map((p) => ({ id: p.id, label: `${p.university?.name ?? ""} — ${p.name}` }))}
                        initial={{ id: c.id, title: c.title, provider: c.provider, category: c.category, duration: c.duration, startDates: c.startDates, fee: String(c.fee), deliveryMode: c.deliveryMode, classSchedule: c.classSchedule, meetingLink: c.meetingLink, prerequisites: c.prerequisites, description: c.description, linkedProgramId: c.linkedProgram?.id }}
                      />
                      <DeleteButton endpoint={`/api/short-courses/${c.id}`} confirmText="Delete this short course?" label="Delete" />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
