import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getShortCourse } from "@/lib/queries";
import { ShortCourseStudio, type ShortCourseSessionInfo } from "@/components/short-course-studio";
import { ShortCourseWorkspaceNav, CourseSectionHeader, EmptyClassroom } from "@/components/short-course-workspace-nav";
import { AddCourseToCalendar } from "@/components/add-course-to-calendar";
import { CourseSessionCalendar } from "@/components/course-session-calendar";

export const metadata = { title: "Class schedule" };

export default async function ShortCourseSessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");
  const course = await getShortCourse(id);
  if (!course) notFound();
  const isAdmin = user.role === "SUPER_ADMIN";
  const enrollment = user.role === "STUDENT" ? await prisma.shortCourseEnrollment.findUnique({ where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } }, select: { status: true } }) : null;
  if (course.status !== "active" && !isAdmin && !enrollment) notFound();
  if (!isAdmin && user.role !== "STUDENT") redirect(`/short-courses/${id}`);
  const hasClassAccess = enrollment?.status === "enrolled" || enrollment?.status === "completed";
  const sessionRows = await prisma.shortCourseSession.findMany({ where: { shortCourseId: id }, orderBy: { startsAt: "asc" } });
  const sessions: ShortCourseSessionInfo[] = sessionRows.map((session) => ({ id: session.id, title: session.title, startsAt: session.startsAt.toISOString(), endsAt: session.endsAt.toISOString(), timeZone: session.timeZone, meetingLink: isAdmin || hasClassAccess ? session.meetingLink : null }));
  return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
    <CourseSectionHeader eyebrow="Classroom · Schedule" title={`${course.title} schedule`} description="See class dates in the course time zone, add sessions to your calendar, and open meeting links when your enrollment is confirmed." />
    <ShortCourseWorkspaceNav courseId={id} active="sessions" isAdmin={isAdmin} />
    {isAdmin ? <><ShortCourseStudio courseId={id} sessions={sessions} materials={[]} view="sessions" /><CourseSessionCalendar sessions={sessions} canJoin /></> : <>
      {sessions.length ? <CourseSessionCalendar sessions={sessions} canJoin={hasClassAccess} /> : <EmptyClassroom title="No class dates yet" description="Your course team will publish the class schedule here when dates are confirmed." />}
      {hasClassAccess && sessions.length > 0 && <div className="flex justify-end"><AddCourseToCalendar title={course.title} provider={course.provider} sessions={sessions} /></div>}
      {!hasClassAccess && <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Meeting links become available after enrollment confirmation. <Link href={`/short-courses/${id}`} className="font-semibold underline">Check enrollment</Link>.</div>}
    </>}
  </div>;
}
