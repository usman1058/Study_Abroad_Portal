import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listPrograms, listShortCourses, serializeProgram } from "@/lib/queries";
import { ShortCourseForm } from "@/components/short-course-form";
import { EnrollButton } from "@/components/enroll-button";
import { DeleteButton } from "@/components/delete-button";
import { FeeDisplay } from "@/components/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Short Courses" };

export default async function ShortCoursesPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const [courses, programs] = await Promise.all([listShortCourses(), listPrograms()]);
  const isSuperAdmin = user.role === "SUPER_ADMIN";

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
                  <Badge tone="brand">{c.category}</Badge>
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
                      {c.startDates
                        .map((d) => new Date(d))
                        .filter((d) => d.getTime() > Date.now())
                        .sort((a, b) => a.getTime() - b.getTime())[0]
                        ? formatDate(c.startDates[0])
                        : "—"}
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
                  {user.role === "STUDENT" && (
                    <EnrollButton
                      shortCourseId={c.id}
                      enrolled={enrolledMap.has(c.id)}
                      status={enrolledMap.get(c.id)}
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