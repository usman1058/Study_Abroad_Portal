import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getShortCourse } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, humanize } from "@/lib/utils";
import { ShortCourseWorkspaceNav, CourseSectionHeader, EmptyClassroom } from "@/components/short-course-workspace-nav";

export const metadata = { title: "Course students" };

export default async function ShortCourseStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "SUPER_ADMIN") redirect(`/short-courses/${id}`);
  const course = await getShortCourse(id);
  if (!course) notFound();
  const roster = await prisma.shortCourseEnrollment.findMany({ where: { shortCourseId: id }, orderBy: { enrolledAt: "desc" }, select: { id: true, status: true, enrolledAt: true, student: { select: { id: true, firstName: true, lastName: true, email: true } } } });
  return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
    <CourseSectionHeader eyebrow="Classroom · Admin" title="Student roster" description={`Enrollment progress and student contact records for ${course.title}.`} />
    <ShortCourseWorkspaceNav courseId={id} active="students" isAdmin />
    <Card className="border-line/80 shadow-sm dark:border-navy-700"><CardHeader><CardTitle>{roster.length} {roster.length === 1 ? "student" : "students"}</CardTitle><p className="text-sm text-ink-muted">Review payment, receipt, and enrollment status at a glance.</p></CardHeader><CardContent>
      {roster.length ? <div className="overflow-x-auto rounded-xl border border-line dark:border-navy-700"><table className="w-full min-w-[680px] text-sm"><caption className="sr-only">Students enrolled in {course.title}</caption><thead className="bg-canvas-subtle text-left text-xs uppercase tracking-wide text-ink-muted dark:bg-navy-800"><tr><th scope="col" className="p-4">Student</th><th scope="col" className="p-4">Email</th><th scope="col" className="p-4">Enrollment</th><th scope="col" className="p-4">Joined</th><th scope="col" className="p-4">Profile</th></tr></thead><tbody className="divide-y divide-line dark:divide-navy-700">{roster.map((entry) => <tr key={entry.id} className="hover:bg-canvas-subtle/70 dark:hover:bg-navy-800/50"><td className="p-4 font-semibold">{entry.student.firstName} {entry.student.lastName}</td><td className="p-4 text-ink-muted">{entry.student.email}</td><td className="p-4"><Badge tone={entry.status === "enrolled" || entry.status === "completed" ? "green" : entry.status === "rejected" ? "red" : "amber"}>{humanize(entry.status)}</Badge></td><td className="p-4 text-ink-muted">{formatDate(entry.enrolledAt)}</td><td className="p-4"><Link href={`/users/${entry.student.id}`} className="font-semibold text-brand-700 underline-offset-2 hover:underline dark:text-brand-300">Open profile</Link></td></tr>)}</tbody></table></div> : <EmptyClassroom title="No students enrolled yet" description="Student enrollment records will appear here as learners join the course." />}
    </CardContent></Card>
  </div>;
}
