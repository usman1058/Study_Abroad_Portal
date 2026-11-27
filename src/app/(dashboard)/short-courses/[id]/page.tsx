import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getShortCourse } from "@/lib/queries";
import { EnrollButton } from "@/components/enroll-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, CalendarDays, Download, ExternalLink, FileCheck2, MessageCircle, WalletCards } from "lucide-react";
import { formatDate, humanize, toNum } from "@/lib/utils";
import { FeeDisplay } from "@/components/currency";
import { ShortCourseWorkspaceNav, CourseSectionHeader } from "@/components/short-course-workspace-nav";

export const metadata = { title: "Course overview" };
type PageProps = { params: Promise<{ id: string }> };

export default async function ShortCourseDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");
  const course = await getShortCourse(id);
  if (!course) notFound();
  const isAdmin = user.role === "SUPER_ADMIN";
  const enrollment = user.role === "STUDENT" ? await prisma.shortCourseEnrollment.findUnique({
    where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
    select: { id: true, status: true, receiptUrl: true },
  }) : null;
  if (course.status !== "active" && !isAdmin && !enrollment) notFound();

  const hasClassAccess = enrollment?.status === "enrolled" || enrollment?.status === "completed";
  const isPaid = course.paymentType === "PAID";
  const nextStart = course.startDates.map((date) => new Date(date)).filter((date) => date.getTime() > Date.now()).sort((a, b) => a.getTime() - b.getTime())[0];
  const statCards = [
    { label: "Duration", value: course.duration, icon: CalendarDays },
    { label: "Delivery", value: humanize(course.deliveryMode), icon: BookOpen },
    { label: "Next start", value: nextStart ? formatDate(nextStart) : "To be confirmed", icon: CalendarDays },
    { label: "Course fee", value: isPaid ? <FeeDisplay amount={toNum(course.fee)} /> : "Free", icon: WalletCards },
  ];

  return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
    <CourseSectionHeader eyebrow={`${humanize(course.category)} · ${humanize(course.paymentType)}`} title={course.title} description={`${course.provider} · Explore the course information, schedule, learning materials, and enrollment in separate sections.`} />
    <ShortCourseWorkspaceNav courseId={course.id} active="overview" isAdmin={isAdmin} />

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {statCards.map(({ label, value, icon: Icon }) => <Card key={label} className="detail-panel border-indigo-200/90 bg-gradient-to-br from-indigo-100/80 via-blue-50/80 to-violet-100/75 shadow-sm dark:border-indigo-800/70 dark:from-indigo-950/55 dark:via-navy-900 dark:to-violet-950/45"><CardContent className="flex items-center gap-3 p-4 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-800 dark:from-indigo-900/60 dark:to-violet-900/50 dark:text-indigo-200"><Icon className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><p className="text-xs font-medium text-ink-muted">{label}</p><p className="mt-1 truncate text-base font-bold">{value}</p></div></CardContent></Card>)}
    </div>

    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card className="detail-panel overflow-hidden border-indigo-200 bg-gradient-to-br from-indigo-100/65 via-blue-50/60 to-violet-100/65 shadow-sm dark:border-indigo-800/70 dark:from-navy-900 dark:via-indigo-950/40 dark:to-violet-950/40"><CardHeader className="border-b border-indigo-200/80 bg-gradient-to-r from-indigo-100 to-violet-100 dark:border-indigo-900/60 dark:from-indigo-950/70 dark:to-violet-950/60"><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700 dark:text-brand-300">At a glance</p><CardTitle className="text-xl">About this course</CardTitle></CardHeader><CardContent className="space-y-5 p-5 sm:p-7">
          <p className="whitespace-pre-line text-sm leading-7 text-ink-muted sm:text-base">{course.description || "Course information will be updated by the provider."}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[{ label: "Provider", value: course.provider }, { label: "Category", value: humanize(course.category) }, { label: "Class schedule", value: course.classSchedule || "To be confirmed" }, { label: "Prerequisites", value: course.prerequisites || "No prerequisites listed" }].map((item) => <div key={item.label} className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-100/80 to-violet-100/65 p-4 dark:border-indigo-900/60 dark:from-indigo-950/60 dark:to-violet-950/40"><p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{item.label}</p><p className="mt-1 text-sm font-semibold leading-6">{item.value}</p></div>)}
          </div>
          {course.linkedProgram && <Link href={`/programs/${course.linkedProgram.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-line-strong px-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-navy-700 dark:text-brand-300 dark:hover:bg-brand-900/30"><ExternalLink className="h-4 w-4" aria-hidden="true" />View related program</Link>}
        </CardContent></Card>

        <Card className="detail-panel border-violet-200 bg-gradient-to-br from-violet-100/70 via-indigo-50/70 to-blue-100/60 shadow-sm dark:border-violet-900/60 dark:from-violet-950/45 dark:via-navy-900 dark:to-indigo-950/45"><CardHeader><CardTitle>Continue to a course section</CardTitle><p className="text-sm text-ink-muted">Each part of your course has a dedicated page for easier access.</p></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">
          {[{ href: `/short-courses/${id}/classroom`, title: "Classroom home", detail: "Your course status and quick links", icon: BookOpen }, { href: `/short-courses/${id}/classroom/sessions`, title: "Class schedule", detail: "Upcoming classes and meeting access", icon: CalendarDays }, { href: `/short-courses/${id}/classroom/materials`, title: "Learning materials", detail: "Course files and study resources", icon: FileCheck2 }].map(({ href, title, detail, icon: Icon }) => <Link key={href} href={href} className="group flex min-h-24 items-center gap-3 rounded-2xl border border-line p-4 transition hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50/70 hover:to-violet-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-navy-700 dark:hover:from-indigo-900/20 dark:hover:to-violet-900/20"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"><Icon className="h-5 w-5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block font-bold">{title}</span><span className="mt-1 block text-sm text-ink-muted">{detail}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-1 group-hover:text-indigo-600" aria-hidden="true" /></Link>)}
        </CardContent></Card>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24">
        {isAdmin && <Card className="detail-panel border-indigo-300 bg-gradient-to-br from-indigo-100 via-blue-50 to-violet-100 shadow-sm dark:border-indigo-800 dark:from-indigo-950/70 dark:via-navy-900 dark:to-violet-950/60"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-700 dark:text-indigo-300">Admin workspace</p><h2 className="mt-1 text-lg font-bold">Manage this classroom</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Schedule lessons, publish resources, and review enrollments.</p></div><Badge tone={course.status === "active" ? "green" : "slate"}>{humanize(course.status)}</Badge></div><div className="mt-4 grid gap-2"><Link href={`/short-courses/${id}/classroom`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white shadow-sm transition hover:brightness-110">Open classroom dashboard <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link><Link href={`/short-courses/${id}/edit`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-900 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-navy-900 dark:text-indigo-100">Edit course details</Link></div></CardContent></Card>}

        {user.role === "STUDENT" && <Card className="detail-panel border-violet-200 bg-gradient-to-br from-violet-100/80 via-indigo-50/75 to-blue-100/70 shadow-sm dark:border-violet-900/70 dark:from-violet-950/55 dark:via-navy-900 dark:to-indigo-950/50"><CardHeader><p className="text-xs font-bold uppercase tracking-[0.15em] text-brand-700 dark:text-brand-300">Enrollment</p><CardTitle>{hasClassAccess ? "You’re in" : enrollment?.status === "pending_approval" ? "Receipt under review" : enrollment?.status === "rejected" ? "Receipt needs attention" : enrollment?.status === "pending_payment" ? "Payment required" : "Join this course"}</CardTitle></CardHeader><CardContent className="space-y-4">
          {!enrollment && <><p className="text-sm leading-6 text-ink-muted">{isPaid ? "Enroll to view the payment instructions, then upload your receipt for staff review." : "Enroll to access the class schedule and learning materials."}</p><EnrollButton shortCourseId={course.id} enrolled={false} paymentType={isPaid ? "PAID" : "FREE"} course={{ fee: toNum(course.fee), deliveryMode: course.deliveryMode, classSchedule: course.classSchedule, meetingLink: null, startDates: course.startDates, duration: course.duration }} /></>}
          {enrollment?.status === "pending_payment" && <div className="space-y-3"><p className="text-sm leading-6 text-ink-muted">Your enrollment is recorded. View the bank instructions and submit your payment receipt from the enrollment page.</p><Link href={`/short-courses/${id}/enroll/confirmation`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white">Continue to payment steps <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link></div>}
          {enrollment?.status === "pending_approval" && <><p className="text-sm leading-6 text-ink-muted">Your receipt has been received. Class access opens after staff approval.</p><a href={`/api/short-courses/${id}/receipt`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-brand-700 underline dark:text-brand-300"><FileCheck2 className="h-4 w-4" aria-hidden="true" />View uploaded receipt</a></>}
          {enrollment?.status === "rejected" && <><p className="text-sm leading-6 text-red-700 dark:text-red-200">Your receipt needs attention. Open the enrollment page to review the status and upload a replacement.</p><Link href={`/short-courses/${id}/enroll/confirmation`} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">Review and resubmit receipt</Link></>}
          {hasClassAccess && <><p className="text-sm leading-6 text-emerald-800 dark:text-emerald-200">Your classroom schedule and published course materials are ready.</p><Link href={`/short-courses/${id}/classroom`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-sm font-bold text-white">Enter classroom <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></>}
          {enrollment?.status === "completed" && <p className="text-xs text-ink-muted">Your certificate is handled by your counselor.</p>}
        </CardContent></Card>}
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><a href={`/api/short-courses/${id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-3 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:bg-navy-900"><Download className="h-4 w-4" aria-hidden="true" />Download course details</a><a href={`https://wa.me/?text=${encodeURIComponent(`Check out ${course.title} by ${course.provider}`)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-navy-900 dark:text-emerald-200"><MessageCircle className="h-4 w-4" aria-hidden="true" />Share course</a></div>
      </aside>
    </div>
  </div>;
}
