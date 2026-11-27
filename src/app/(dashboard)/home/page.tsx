import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ApplicationStage } from "@/generated/prisma/client";
import { DashboardAdRail } from "@/components/dashboard-ad-rail";

export const metadata = { title: "Home" };

const TERMINAL: ApplicationStage[] = ["ENROLLED", "REJECTED", "WITHDRAWN"];

export default async function HomePage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const trendMonths = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return { start, end: new Date(now.getFullYear(), now.getMonth() - (4 - index), 1), label: start.toLocaleString("en", { month: "short" }) };
  });
  const studentScope = studentScopeWhere(user);
  const canManageUsers = user.role === "SUPER_ADMIN" || user.role === "MANAGER";
  const canSeeReports = user.role === "SUPER_ADMIN" || user.role === "MANAGER";

  const [leadsThisWeek, appsInProgress, pendingDocs, visaApps, recentApps, unreadNotifs, totalStudents, activePrograms, courseEnrollments, revenueByCurrencyRows, advertisements, stageStats] = await Promise.all([
    prisma.user.count({ where: { ...studentScope, createdAt: { gte: weekAgo } } }),
    prisma.application.count({ where: { stage: { notIn: TERMINAL }, student: studentScope } }),
    prisma.document.count({ where: { status: "PENDING", owner: { role: "STUDENT", ...studentScope } } }),
    prisma.application.count({ where: { stage: "VISA", student: studentScope } }),
    prisma.application.findMany({
      where: { student: studentScope }, take: 6, orderBy: { updatedAt: "desc" },
      include: { student: { select: { id: true, firstName: true, lastName: true } }, program: { select: { name: true, university: { select: { name: true } } } } },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    prisma.user.count({ where: studentScope }),
    prisma.program.count(),
    prisma.shortCourseEnrollment.count({ where: { status: { in: ["enrolled", "completed"] } } }),
    prisma.transaction.groupBy({ by: ["currency"], where: user.role === "SUPER_ADMIN" ? { type: { not: "REFUND" } } : { type: { not: "REFUND" }, relatedStudent: studentScope }, _sum: { amount: true } }),
    prisma.dashboardAdvertisement.findMany({
      where: user.role === "SUPER_ADMIN" ? {} : { active: true, AND: [{ OR: [{ targetRoles: { isEmpty: true } }, { targetRoles: { has: user.role } }] }, { OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      select: { id: true, title: true, body: true, imageUrl: true, linkUrl: true, ctaLabel: true, active: true, targetRoles: true, sortOrder: true, startsAt: true, endsAt: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.application.groupBy({ by: ["stage"], where: { student: studentScope }, _count: { _all: true } }),
  ]);

  const trendCounts = await Promise.all(trendMonths.map((month) => prisma.application.count({ where: { student: studentScope, createdAt: { gte: month.start, lt: month.end } } })));
  const revenueSummary = revenueByCurrencyRows.map((row) => formatCurrency(Number(row._sum.amount ?? 0), row.currency)).join(" · ") || "—";
  const stageCount = new Map(stageStats.map((item) => [item.stage, item._count._all]));
  const pipeline = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER", "VISA", "ENROLLED"] as ApplicationStage[];
  const pipelineMax = Math.max(1, ...pipeline.map((stage) => stageCount.get(stage) ?? 0));
  const trend = trendMonths.map((month, index) => ({ label: month.label, value: trendCounts[index] }));

  const quickActions = [
    { href: "/application", label: "Review applications", detail: "Pipeline and decisions", icon: ClipboardList },
    { href: "/documents", label: "Verify documents", detail: `${pendingDocs} pending review`, icon: ShieldCheck },
    { href: "/messages", label: "Open messages", detail: unreadNotifs ? `${unreadNotifs} unread updates` : "Inbox and notifications", icon: MessageSquare },
    ...(canManageUsers ? [{ href: "/users", label: "Manage students", detail: "Accounts and assignments", icon: Users }] : []),
    ...(canSeeReports ? [{ href: "/reports", label: "Open reports", detail: "Export and performance", icon: BarChart3 }] : []),
    { href: "/short-courses", label: "Short courses", detail: "Course catalog", icon: BookOpen },
  ];

  const showUpdatesPanel = user.role === "SUPER_ADMIN" || advertisements.length > 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#211744] via-[#37318c] to-[#315ebd] text-white shadow-lg shadow-navy-900/20">
        <div className="relative p-5 sm:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-200">{ROLE_LABELS[user.role]} workspace</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Good to see you, {user.name.split(" ")[0]}.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-navy-100">{unreadNotifs ? `You have ${unreadNotifs} update${unreadNotifs === 1 ? "" : "s"} waiting. ` : "Everything is up to date. "}Here is your live admissions overview.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/application" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"><ClipboardList className="h-4 w-4" /> Applications</Link>
              <Link href="/search" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"><Users className="h-4 w-4" /> Search programs</Link>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Dashboard overview" className={`grid grid-cols-1 items-start gap-5 xl:gap-6 ${showUpdatesPanel ? "xl:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="dashboard-metrics-heading" className="space-y-3">
            <h2 id="dashboard-metrics-heading" className="text-lg font-bold tracking-tight">At a glance</h2>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <MetricCard label="Applications in progress" value={appsInProgress} hint="Across your accessible students" icon={ClipboardList} tone="brand" href="/application" />
              <MetricCard label="Pending documents" value={pendingDocs} hint="Needs verification" icon={FileCheck2} tone="amber" href="/documents" />
              <MetricCard label="New leads" value={leadsThisWeek} hint="Created in the last 7 days" icon={Users} tone="indigo" href={canManageUsers ? "/users" : null} />
              <MetricCard label="Visa-stage cases" value={visaApps} hint="Ready for attention" icon={GraduationCap} tone="violet" href="/application" />
            </div>
          </section>
          {user.role === "SUPER_ADMIN" && <section aria-labelledby="admin-metrics-heading" className="space-y-3"><h2 id="admin-metrics-heading" className="text-lg font-bold tracking-tight">Administration snapshot</h2><div className="grid grid-cols-2 gap-3 sm:gap-4"><MetricCard label="Total students" value={totalStudents} hint="All active records" icon={Users} tone="brand" href="/users" /><MetricCard label="Active programs" value={activePrograms} hint="Catalog availability" icon={GraduationCap} tone="indigo" href="/programs" /><MetricCard label="Course enrollments" value={courseEnrollments} hint="Enrolled or completed" icon={BookOpen} tone="violet" href="/short-courses" /><MetricCard label="Recorded revenue" value={revenueSummary} hint="Excluding refunds" icon={WalletCards} tone="amber" href="/transaction" /></div></section>}
        </div>
        {showUpdatesPanel && <aside aria-label="Featured updates" className="min-w-0 xl:sticky xl:top-20"><DashboardAdRail id="dashboard-advertisements" ads={advertisements} canManage={user.role === "SUPER_ADMIN"} variant="hero" /></aside>}
      </section>

      <div className="space-y-7">
          <section aria-labelledby="admissions-overview-heading" className="space-y-3">
          <h2 id="admissions-overview-heading" className="text-lg font-bold tracking-tight">Admissions overview</h2>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle>Application activity</CardTitle><CardDescription>New applications over the last six months</CardDescription></div><span className="rounded-lg bg-brand-50 p-2 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"><TrendingUp className="h-4 w-4" /></span></CardHeader>
              <CardContent><TrendChart points={trend} /><Link href="/application" className="mt-4 inline-flex min-h-6 items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">View application pipeline <ArrowRight className="h-4 w-4" /></Link></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Pipeline health</CardTitle><CardDescription>Where your active cases are now</CardDescription></CardHeader>
              <CardContent className="space-y-3">{pipeline.map((stage) => <PipelineRow key={stage} label={stage.replace(/_/g, " ")} value={stageCount.get(stage) ?? 0} max={pipelineMax} />)}<Link href="/application" className="mt-2 inline-flex min-h-6 items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">Manage pipeline <ArrowRight className="h-4 w-4" /></Link></CardContent>
            </Card>
          </div>
          </section>

          <section aria-labelledby="portfolio-activity-heading" className="space-y-3">
          <h2 id="portfolio-activity-heading" className="text-lg font-bold tracking-tight">Portfolio activity</h2>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Recent application activity</CardTitle><CardDescription>Latest updates across your portfolio</CardDescription></div><Link href="/application" className="inline-flex min-h-6 items-center text-sm font-semibold text-brand-600 hover:underline">View all</Link></CardHeader>
              <CardContent>{recentApps.length === 0 ? <EmptyState text="Applications will appear here as soon as students start applying." href="/application" label="Open applications" /> : <ul className="divide-y divide-line dark:divide-navy-700">{recentApps.map((application) => <li key={application.id} className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"><GraduationCap className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{application.student.firstName} {application.student.lastName}</p><p className="truncate text-xs text-ink-muted">{application.program.name} · {application.program.university.name}</p></div><div className="shrink-0 text-right"><Badge tone={application.stage === "REJECTED" ? "red" : application.stage === "OFFER" || application.stage === "ENROLLED" ? "green" : "brand"}>{application.stage.replace(/_/g, " ")}</Badge><p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{formatDate(application.updatedAt)}</p></div></li>)}</ul>}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Workspace tools</CardTitle><CardDescription>Common actions for today</CardDescription></CardHeader>
              <CardContent className="grid grid-cols-1 gap-2">{quickActions.map((action) => <Link key={action.href} href={action.href} className="group flex min-h-14 min-w-0 items-center gap-3 rounded-xl border border-line p-3 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-navy-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/15"><span className="shrink-0 rounded-lg bg-canvas-subtle p-2 text-ink-muted transition group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-navy-800 dark:text-slate-300 dark:group-hover:bg-brand-900/40 dark:group-hover:text-brand-200"><action.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-5">{action.label}</span><span className="block truncate text-xs text-ink-muted">{action.detail}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-600" /></Link>)}</CardContent>
            </Card>
          </div>
          </section>

      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon, tone, href }: { label: string; value: string | number; hint: string; icon: typeof Users; tone: "brand" | "amber" | "indigo" | "violet"; href: string | null }) {
  const colors = { brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200", amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200", indigo: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200", violet: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200" };
  const content = <Card data-metric={label} className="h-full transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"><CardContent className="flex items-start justify-between gap-2 p-3 sm:gap-3 sm:p-5"><div className="min-w-0"><p className="text-xs font-medium leading-4 text-ink-muted">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">{hint}</p></div><span className={`shrink-0 rounded-xl p-2 sm:p-2.5 ${colors[tone]}`}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></span></CardContent></Card>;
  return href ? <Link href={href}>{content}</Link> : content;
}

function PipelineRow({ label, value, max }: { label: string; value: number; max: number }) {
  return <div><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-ink-muted dark:text-slate-300">{label}</span><span className="font-semibold">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-canvas-subtle dark:bg-navy-800"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-indigo-500" style={{ width: `${value ? Math.max(8, Math.round((value / max) * 100)) : 0}%` }} /></div></div>;
}

function TrendChart({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const coords = points.map((point, index) => `${index * 20 + 5},${90 - (point.value / max) * 66}`).join(" ");
  return <div aria-label="Applications over the last six months" role="img"><svg viewBox="0 0 110 108" className="h-44 w-full overflow-visible sm:h-52" preserveAspectRatio="none"><defs><linearGradient id="home-trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#704cc8" stopOpacity=".28" /><stop offset="1" stopColor="#704cc8" stopOpacity="0" /></linearGradient></defs><line x1="5" x2="105" y1="90" y2="90" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="2 3" /><polyline points={`5,90 ${coords} 105,90`} fill="url(#home-trend-fill)" stroke="none" /><polyline points={coords} fill="none" stroke="#704cc8" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />{points.map((point, index) => <g key={point.label}><circle cx={index * 20 + 5} cy={90 - (point.value / max) * 66} r="2.5" fill="#704cc8" /><text x={index * 20 + 5} y="104" textAnchor="middle" fontSize="6" fill="currentColor">{point.label}</text></g>)}</svg><div className="mt-1 flex justify-between text-xs text-ink-muted"><span>0 applications</span><span>{max} monthly peak</span></div></div>;
}

function EmptyState({ text, href, label }: { text: string; href: string; label: string }) {
  return <div className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center dark:border-navy-700"><CheckCircle2 className="mx-auto h-6 w-6 text-slate-400" /><p className="mx-auto mt-2 max-w-xs text-sm text-ink-muted">{text}</p><Link href={href} className="mt-3 inline-flex text-sm font-semibold text-brand-600 hover:underline">{label}</Link></div>;
}
