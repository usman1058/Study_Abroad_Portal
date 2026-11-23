import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DashboardAdRail } from "@/components/dashboard-ad-rail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FileCheck2, GraduationCap, MessageSquare, Sparkles } from "lucide-react";
import { humanize } from "@/lib/utils";

export async function StudentDashboardContent() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/home");

  const now = new Date();
  const [courseEnrollments, availableCourses, advertisements, totalDocs, pendingDocs, unreadMessages] = await Promise.all([
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
  ]);

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-900 via-navy-800 to-brand-700 px-5 py-6 text-white shadow-lg sm:px-7 sm:py-8">
      <div aria-hidden="true" className="absolute right-0 top-0 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold text-brand-200"><Sparkles className="h-4 w-4" /> Student workspace</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Welcome, {user.name.split(" ")[0]}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-navy-100">Your courses, documents, announcements, and support in one place.</p></div><div className="flex flex-wrap gap-2"><Link href="/scholarships" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"><GraduationCap className="h-4 w-4" /> Explore scholarships</Link><Link href="/messages" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20"><MessageSquare className="h-4 w-4" /> Contact support</Link></div></div>
    </section>

    <section aria-label="Student overview" className="grid gap-3 sm:grid-cols-3">
      <Link href="/documents"><Card className="h-full transition hover:border-brand-300 hover:shadow-md"><CardContent className="flex items-center justify-between gap-3 p-5"><div><p className="text-sm text-ink-muted">Documents needing attention</p><p className="mt-1 text-2xl font-bold">{pendingDocs}</p><p className="mt-1 text-xs text-ink-muted">{totalDocs} total documents</p></div><FileCheck2 className="h-5 w-5 text-brand-600" /></CardContent></Card></Link>
      <Link href="/messages"><Card className="h-full transition hover:border-brand-300 hover:shadow-md"><CardContent className="flex items-center justify-between gap-3 p-5"><div><p className="text-sm text-ink-muted">Unread messages</p><p className="mt-1 text-2xl font-bold">{unreadMessages}</p><p className="mt-1 text-xs text-ink-muted">Updates from your support team</p></div><MessageSquare className="h-5 w-5 text-brand-600" /></CardContent></Card></Link>
      <Link href="/short-courses"><Card className="h-full transition hover:border-brand-300 hover:shadow-md"><CardContent className="flex items-center justify-between gap-3 p-5"><div><p className="text-sm text-ink-muted">My short courses</p><p className="mt-1 text-2xl font-bold">{courseEnrollments.length}</p><p className="mt-1 text-xs text-ink-muted">Active learning</p></div><GraduationCap className="h-5 w-5 text-brand-600" /></CardContent></Card></Link>
    </section>

    <section aria-label="Student announcements" className="grid gap-5 xl:grid-cols-2"><DashboardAdRail ads={advertisements} variant="image" /><Card><CardHeader><CardTitle>Keep your journey moving</CardTitle><p className="text-sm text-ink-muted">Quick links to common tasks.</p></CardHeader><CardContent className="grid gap-2">{[{ href: "/documents", title: "Check documents", detail: totalDocs === 0 ? "Upload your first document" : pendingDocs ? `${pendingDocs} document${pendingDocs === 1 ? "" : "s"} need attention` : "All documents are verified", icon: FileCheck2 }, { href: "/short-courses", title: "Explore courses", detail: courseEnrollments.length ? `${courseEnrollments.length} course${courseEnrollments.length === 1 ? "" : "s"} in your list` : "Find a course to start", icon: GraduationCap }, { href: "/programs", title: "Find a program", detail: "Compare universities and options", icon: GraduationCap }].map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-navy-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/15"><span className="rounded-lg bg-canvas-subtle p-2 text-ink-muted group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-navy-800 dark:text-slate-300 dark:group-hover:bg-brand-900/40 dark:group-hover:text-brand-200"><item.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="block truncate text-xs text-ink-muted">{item.detail}</span></span><ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" /></Link>)}</CardContent></Card></section>

    <Card><CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>My course list</CardTitle><p className="mt-1 text-sm text-ink-muted">Your current learning and active courses ready to join.</p></div><Link href="/short-courses" className="inline-flex min-h-9 items-center text-sm font-semibold text-brand-600 hover:underline">Browse courses</Link></CardHeader><CardContent>{courseEnrollments.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{courseEnrollments.map((entry) => <Link key={entry.id} href={`/short-courses/${entry.shortCourse.id}`} className="group min-w-0 rounded-xl border border-line p-4 transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-navy-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/15"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold group-hover:text-brand-700">{entry.shortCourse.title}</p><p className="mt-1 truncate text-xs text-ink-muted">{entry.shortCourse.provider}</p></div><Badge tone={entry.status === "completed" ? "green" : entry.status === "enrolled" ? "brand" : "amber"}>{humanize(entry.status)}</Badge></div><p className="mt-3 text-xs text-ink-muted">{entry.shortCourse.duration} · {humanize(entry.shortCourse.deliveryMode)}</p></Link>)}</div> : availableCourses.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{availableCourses.map((course) => <Link key={course.id} href={`/short-courses/${course.id}`} className="group min-w-0 rounded-xl border border-line p-4 transition hover:border-brand-300 hover:bg-brand-50/40"><p className="truncate text-sm font-semibold">{course.title}</p><p className="mt-1 truncate text-xs text-ink-muted">{course.provider}</p><p className="mt-3 text-xs text-ink-muted">{course.duration} · {humanize(course.deliveryMode)}</p></Link>)}</div> : <p className="py-8 text-center text-sm text-ink-muted">No active short courses are available yet.</p>}</CardContent></Card>
  </div>;
}
