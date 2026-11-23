import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DashboardAdRail } from "@/components/dashboard-ad-rail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FileCheck2, GraduationCap, MessageSquare, Sparkles, ClipboardList } from "lucide-react";
import { humanize } from "@/lib/utils";
import { APPLICATION_STAGE_ORDER } from "@/lib/constants";

export async function StudentDashboardContent() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/home");

  const now = new Date();
  const [courseEnrollments, availableCourses, advertisements, totalDocs, pendingDocs, unreadMessages, applications] = await Promise.all([
    prisma.shortCourseEnrollment.findMany({
      where: { studentId: user.id, status: { notIn: ["withdrawn", "rejected"] } },
      orderBy: { enrolledAt: "desc" },
      take: 4,
      include: { shortCourse: { select: { id: true, title: true, provider: true, duration: true, deliveryMode: true } } },
    }),
    prisma.shortCourse.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, title: true, provider: true, duration: true, deliveryMode: true },
    }),
    prisma.dashboardAdvertisement.findMany({
      where: { active: true, AND: [{ OR: [{ targetRoles: { isEmpty: true } }, { targetRoles: { has: "STUDENT" } }] }, { OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      select: { id: true, title: true, body: true, imageUrl: true, linkUrl: true, ctaLabel: true, active: true, targetRoles: true, sortOrder: true, startsAt: true, endsAt: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.document.count({ where: { ownerId: user.id } }),
    prisma.document.count({ where: { ownerId: user.id, status: { not: "VERIFIED" } } }),
    prisma.message.count({ where: { recipientId: user.id, readAt: null } }),
    prisma.application.findMany({ where: { studentId: user.id }, select: { stage: true, createdAt: true } }),
  ]);

  const appStages = APPLICATION_STAGE_ORDER.map((stage) => ({ stage, count: applications.filter((app) => app.stage === stage).length }));
  const maxStageCount = Math.max(1, ...appStages.map((item) => item.count));
  const monthLabels = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return { label: new Intl.DateTimeFormat("en", { month: "short" }).format(date), year: date.getFullYear(), month: date.getMonth() };
  });
  const monthlyApplications = monthLabels.map((item) => applications.filter((app) => app.createdAt.getFullYear() === item.year && app.createdAt.getMonth() === item.month).length);
  const maxMonthly = Math.max(1, ...monthlyApplications);

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 px-5 py-6 text-white shadow-lg sm:px-7 sm:py-8">
      <div aria-hidden="true" className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold text-brand-200"><Sparkles className="h-4 w-4" /> Student workspace</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Welcome, {user.name.split(" ")[0]}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-navy-100">Your courses, documents, announcements, and support in one place.</p></div><div className="flex flex-wrap gap-2"><Link href="/scholarships" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"><GraduationCap className="h-4 w-4" /> Explore scholarships</Link><Link href="/messages" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"><MessageSquare className="h-4 w-4" /> Contact support</Link></div></div>
    </section>

    <section aria-label="Student overview" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Link href="/my-applications" className="min-w-0"><Card className="h-full transition hover:border-brand-300 hover:shadow-md"><CardContent className="flex min-h-36 flex-col justify-between gap-4 p-5"><div className="flex items-start justify-between gap-3"><p className="min-h-10 max-w-[14rem] text-sm font-medium leading-5 text-ink-muted">Applications</p><ClipboardList className="h-5 w-5 shrink-0 text-brand-600" /></div><div><p className="text-3xl font-bold leading-none tabular-nums">{applications.length}</p><p className="mt-2 text-xs leading-5 text-ink-muted">View your application progress</p></div></CardContent></Card></Link>
      <Link href="/documents" className="min-w-0"><Card className="h-full transition hover:border-brand-300 hover:shadow-md"><CardContent className="flex min-h-36 flex-col justify-between gap-4 p-5"><div className="flex items-start justify-between gap-3"><p className="min-h-10 max-w-[14rem] text-sm font-medium leading-5 text-ink-muted">Documents needing attention</p><FileCheck2 className="h-5 w-5 shrink-0 text-brand-600" /></div><div><p className="text-3xl font-bold leading-none tabular-nums">{pendingDocs}</p><p className="mt-2 text-xs leading-5 text-ink-muted">{totalDocs} total documents</p></div></CardContent></Card></Link>
      <Link href="/messages" className="min-w-0"><Card className="h-full transition hover:border-brand-300 hover:shadow-md"><CardContent className="flex min-h-36 flex-col justify-between gap-4 p-5"><div className="flex items-start justify-between gap-3"><p className="min-h-10 max-w-[14rem] text-sm font-medium leading-5 text-ink-muted">Unread messages</p><MessageSquare className="h-5 w-5 shrink-0 text-brand-600" /></div><div><p className="text-3xl font-bold leading-none tabular-nums">{unreadMessages}</p><p className="mt-2 text-xs leading-5 text-ink-muted">Updates from your support team</p></div></CardContent></Card></Link>
      <Link href="/short-courses" className="min-w-0"><Card className="h-full transition hover:border-brand-300 hover:shadow-md"><CardContent className="flex min-h-36 flex-col justify-between gap-4 p-5"><div className="flex items-start justify-between gap-3"><p className="min-h-10 max-w-[14rem] text-sm font-medium leading-5 text-ink-muted">My short courses</p><GraduationCap className="h-5 w-5 shrink-0 text-brand-600" /></div><div><p className="text-3xl font-bold leading-none tabular-nums">{courseEnrollments.length}</p><p className="mt-2 text-xs leading-5 text-ink-muted">Active learning</p></div></CardContent></Card></Link>
    </section>

    <section aria-label="Student announcements" className="grid gap-5 xl:grid-cols-2"><DashboardAdRail ads={advertisements} variant="image" /><Card><CardHeader><CardTitle>Keep your journey moving</CardTitle><p className="text-sm text-ink-muted">Quick links to common tasks.</p></CardHeader><CardContent className="grid gap-2">{[{ href: "/documents", title: "Check documents", detail: totalDocs === 0 ? "Upload your first document" : pendingDocs ? `${pendingDocs} document${pendingDocs === 1 ? "" : "s"} need attention` : "All documents are verified", icon: FileCheck2 }, { href: "/short-courses", title: "Explore courses", detail: courseEnrollments.length ? `${courseEnrollments.length} course${courseEnrollments.length === 1 ? "" : "s"} in your list` : "Find a course to start", icon: GraduationCap }, { href: "/programs", title: "Find a program", detail: "Compare universities and options", icon: GraduationCap }].map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-navy-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/15"><span className="rounded-lg bg-canvas-subtle p-2 text-ink-muted group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-navy-800 dark:text-slate-300 dark:group-hover:bg-brand-900/40 dark:group-hover:text-brand-200"><item.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="block truncate text-xs text-ink-muted">{item.detail}</span></span><ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" /></Link>)}</CardContent></Card></section>

    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>My course list</CardTitle><p className="mt-1 text-sm text-ink-muted">Your current learning and active courses ready to join.</p></div><Link href="/short-courses" className="inline-flex min-h-9 items-center text-sm font-semibold text-brand-600 hover:underline">Browse courses</Link></CardHeader><CardContent>{courseEnrollments.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{courseEnrollments.map((entry) => <Link key={entry.id} href={`/short-courses/${entry.shortCourse.id}`} className="group min-w-0 rounded-xl border border-line p-4 transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-navy-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/15"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold group-hover:text-brand-700">{entry.shortCourse.title}</p><p className="mt-1 truncate text-xs text-ink-muted">{entry.shortCourse.provider}</p></div><Badge tone={entry.status === "completed" ? "green" : entry.status === "enrolled" ? "brand" : "amber"}>{humanize(entry.status)}</Badge></div><p className="mt-3 text-xs text-ink-muted">{entry.shortCourse.duration} · {humanize(entry.shortCourse.deliveryMode)}</p></Link>)}</div> : availableCourses.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{availableCourses.map((course) => <Link key={course.id} href={`/short-courses/${course.id}`} className="group min-w-0 rounded-xl border border-line p-4 transition hover:border-brand-300 hover:bg-brand-50/40"><p className="truncate text-sm font-semibold">{course.title}</p><p className="mt-1 truncate text-xs text-ink-muted">{course.provider}</p><p className="mt-3 text-xs text-ink-muted">{course.duration} · {humanize(course.deliveryMode)}</p></Link>)}</div> : <p className="py-8 text-center text-sm text-ink-muted">No active short courses are available yet.</p>}</CardContent></Card>

    <section aria-label="Application progress overview" className="grid gap-5 xl:grid-cols-2">
      <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>Application progress</CardTitle><p className="mt-1 text-sm text-ink-muted">A stage summary of your applications.</p></div><Link href="/my-applications" className="text-sm font-semibold text-brand-600 hover:underline">View applications</Link></CardHeader><CardContent><div className="space-y-3">{appStages.map(({ stage, count }) => <div key={stage} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-3 text-sm"><span className="truncate text-ink-muted">{humanize(stage)}</span><div className="h-2 overflow-hidden rounded-full bg-canvas-subtle dark:bg-navy-800" role="img" aria-label={`${count} ${humanize(stage)} applications`}><div className="h-full rounded-full bg-brand-600" style={{ width: `${(count / maxStageCount) * 100}%` }} /></div><span className="text-right font-semibold">{count}</span></div>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle>Applications over time</CardTitle><p className="mt-1 text-sm text-ink-muted">New applications created in the last six months.</p></CardHeader><CardContent><div className="flex h-40 items-end justify-around gap-3 border-b border-line px-2 dark:border-navy-700" role="img" aria-label="Bar chart showing new applications by month">{monthLabels.map((item, index) => <div key={`${item.year}-${item.month}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-medium text-ink-muted">{monthlyApplications[index]}</span><div className="w-full max-w-10 rounded-t-md bg-brand-600" style={{ height: `${Math.max(5, (monthlyApplications[index] / maxMonthly) * 100)}%` }} /><span className="pb-2 text-xs text-ink-muted">{item.label}</span></div>)}</div></CardContent></Card>
    </section>
  </div>;
}
