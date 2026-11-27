import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getShortCourse } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, CalendarDays, FileText, Users } from "lucide-react";
import { formatDate, humanize } from "@/lib/utils";
import { ShortCourseWorkspaceNav, CourseSectionHeader } from "@/components/short-course-workspace-nav";

export const metadata = { title: "Course classroom" };

export default async function CourseClassroomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");
  const course = await getShortCourse(id);
  if (!course) notFound();
  const isAdmin = user.role === "SUPER_ADMIN";
  const enrollment = user.role === "STUDENT" ? await prisma.shortCourseEnrollment.findUnique({ where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } }, select: { status: true } }) : null;
  if (course.status !== "active" && !isAdmin && !enrollment) notFound();
  if (!isAdmin && user.role !== "STUDENT") redirect(`/short-courses/${id}`);
  const hasAccess = enrollment?.status === "enrolled" || enrollment?.status === "completed";
  const [upcomingCount, materialCount, rosterCount, nextSession] = await Promise.all([
    prisma.shortCourseSession.count({ where: { shortCourseId: id, startsAt: { gte: new Date() } } }),
    prisma.shortCourseMaterial.count({ where: { shortCourseId: id, ...(isAdmin ? {} : { published: true }) } }),
    isAdmin ? prisma.shortCourseEnrollment.count({ where: { shortCourseId: id } }) : Promise.resolve(0),
    prisma.shortCourseSession.findFirst({ where: { shortCourseId: id, startsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, select: { title: true, startsAt: true, timeZone: true } }),
  ]);
  const sections = [
    { href: `/short-courses/${id}/classroom/sessions`, label: "Class schedule", description: "Review upcoming lessons, time zones, and available meeting links.", count: `${upcomingCount} upcoming`, icon: CalendarDays },
    { href: `/short-courses/${id}/classroom/materials`, label: "Learning materials", description: "Open the files and resources shared for this course.", count: `${materialCount} ${materialCount === 1 ? "resource" : "resources"}`, icon: BookOpen },
    ...(isAdmin ? [{ href: `/short-courses/${id}/classroom/students`, label: "Student roster", description: "Review enrollment progress and student records for this course.", count: `${rosterCount} enrolled`, icon: Users }] : []),
  ];
  return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
    <CourseSectionHeader eyebrow={isAdmin ? "Admin classroom" : "Your learning space"} title={course.title} description={isAdmin ? "Manage the course experience from focused sections for scheduling, resources, and student enrollment." : "Your schedule and course resources are organized here. Meeting links and materials unlock after enrollment confirmation."} />
    <ShortCourseWorkspaceNav courseId={id} active="classroom" isAdmin={isAdmin} />
    <section aria-label="Course classroom status" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[{ label: "Enrollment", value: isAdmin ? humanize(course.status) : enrollment ? humanize(enrollment.status) : "Not enrolled", icon: Users }, { label: "Upcoming classes", value: upcomingCount, icon: CalendarDays }, { label: "Learning resources", value: materialCount, icon: FileText }, ...(isAdmin ? [{ label: "Students", value: rosterCount, icon: Users }] : [])].map(({ label, value, icon: Icon }) => <Card key={label} className="border-line/80 shadow-sm dark:border-navy-700"><CardContent className="flex items-center gap-3 p-4"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="text-xs font-medium text-ink-muted">{label}</p><p className="mt-1 font-bold">{value}</p></div></CardContent></Card>)}
    </section>
    {!isAdmin && !hasAccess && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Classroom access is locked until your enrollment is confirmed. <Link className="font-semibold underline" href={`/short-courses/${id}`}>View enrollment and payment status</Link>.</div>}
    {nextSession && <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-5 dark:border-indigo-900 dark:from-indigo-950/40 dark:to-violet-950/30"><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-800 dark:text-indigo-200">Next class</p><p className="mt-1 text-lg font-bold">{nextSession.title}</p><p className="mt-1 text-sm text-ink-muted">{formatDate(nextSession.startsAt)} · {nextSession.timeZone}</p></div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sections.map(({ href, label, description, count, icon: Icon }) => <Link key={label} href={href} className="group rounded-2xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-navy-700 dark:bg-navy-900"><div className="flex items-start justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-700 dark:from-indigo-900/40 dark:to-violet-900/30 dark:text-indigo-200"><Icon className="h-5 w-5" aria-hidden="true" /></span><Badge tone="brand">{count}</Badge></div><h2 className="mt-5 text-lg font-bold">{label}</h2><p className="mt-2 min-h-12 text-sm leading-6 text-ink-muted">{description}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 dark:text-indigo-300">Open section <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" aria-hidden="true" /></span></Link>)}</div>
  </div>;
}
