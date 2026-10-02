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
import { formatCurrency, formatDate, toNum } from "@/lib/utils";
import type { ApplicationStage } from "@/generated/prisma/client";
import { DashboardAdRail } from "@/components/dashboard-ad-rail";

export const metadata = { title: "Home" };

const TERMINAL: ApplicationStage[] = ["ENROLLED", "REJECTED", "WITHDRAWN"];

export default async function HomePage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const studentScope = studentScopeWhere(user);
  const canManageUsers = user.role === "SUPER_ADMIN" || user.role === "MANAGER";
  const canSeeReports = user.role !== "COUNSELOR";

  const [leadsThisWeek, appsInProgress, pendingDocs, visaApps, recentApps, unreadNotifs, totalStudents, activePrograms, courseEnrollments, revenueTransactions, advertisements, stageStats, trendRows] = await Promise.all([
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
    prisma.transaction.findMany({ where: user.role === "SUPER_ADMIN" ? { type: { not: "REFUND" } } : { type: { not: "REFUND" }, relatedStudent: studentScope }, select: { amount: true, currency: true }, take: 1000 }),
    prisma.dashboardAdvertisement.findMany({
      where: user.role === "SUPER_ADMIN" ? {} : { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      select: { id: true, title: true, body: true, imageUrl: true, linkUrl: true, ctaLabel: true, active: true, sortOrder: true, startsAt: true, endsAt: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.application.groupBy({ by: ["stage"], where: { student: studentScope }, _count: { _all: true } }),
    prisma.application.findMany({ where: { student: studentScope }, select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1000 }),
  ]);

  const revenueByCurrency = revenueTransactions.reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.currency] = (totals[transaction.currency] ?? 0) + toNum(transaction.amount);
    return totals;
  }, {});
  const revenueSummary = Object.entries(revenueByCurrency).map(([currency, amount]) => formatCurrency(amount, currency)).join(" · ") || "—";
  const stageCount = new Map(stageStats.map((item) => [item.stage, item._count._all]));
  const pipeline = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER", "VISA", "ENROLLED"] as ApplicationStage[];
  const pipelineMax = Math.max(1, ...pipeline.map((stage) => stageCount.get(stage) ?? 0));
  const trend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const next = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);
    return { label: date.toLocaleString("en", { month: "short" }), value: trendRows.filter((row) => row.createdAt >= date && row.createdAt < next).length };
  });

  const quickActions = [
    { href: "/application", label: "Review applications", detail: "Pipeline and decisions", icon: ClipboardList },
    { href: "/documents", label: "Verify documents", detail: `${pendingDocs} pending review`, icon: ShieldCheck },
    { href: "/messages", label: "Open messages", detail: unreadNotifs ? `${unreadNotifs} unread updates` : "Inbox and notifications", icon: MessageSquare },
    ...(canManageUsers ? [{ href: "/users", label: "Manage students", detail: "Accounts and assignments", icon: Users }] : []),
    ...(canSeeReports ? [{ href: "/reports", label: "Open reports", detail: "Export and performance", icon: BarChart3 }] : []),
    { href: "/short-courses", label: "Short courses", detail: "Course catalog", icon: BookOpen },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-600 text-white shadow-lg shadow-brand-900/10">
        <div className="relative p-5 sm:p-7">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-brand-100">{ROLE_LABELS[user.role]} workspace</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Good to see you, {user.name.split(" ")[0]}.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-50">{unreadNotifs ? `You have ${unreadNotifs} update${unreadNotifs === 1 ? "" : "s"} waiting. ` : "Everything is up to date. "}Here is your live admissions overview.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/application" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"><ClipboardList className="h-4 w-4" /> Applications</Link>
              <Link href="/search" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"><Users className="h-4 w-4" /> Find a student</Link>
            </div>
          </div>
        </div>
      </section>

      {(user.role === "SUPER_ADMIN" || advertisements.length > 0) && <div className="xl:hidden"><DashboardAdRail ads={advertisements} canManage={user.role === "SUPER_ADMIN"} variant="hero" /></div>}

      <section aria-label="Dashboard metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Applications in progress" value={appsInProgress} hint="Across your accessible students" icon={ClipboardList} tone="brand" href="/application" />
        <MetricCard label="Pending documents" value={pendingDocs} hint="Needs verification" icon={FileCheck2} tone="amber" href="/documents" />
        <MetricCard label="New leads" value={leadsThisWeek} hint="Created in the last 7 days" icon={Users} tone="cyan" href={canManageUsers ? "/users" : null} />
        <MetricCard label="Visa-stage cases" value={visaApps} hint="Ready for attention" icon={GraduationCap} tone="violet" href="/application" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle>Application activity</CardTitle><CardDescription>New applications over the last six months</CardDescription></div><span className="rounded-lg bg-brand-50 p-2 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"><TrendingUp className="h-4 w-4" /></span></CardHeader>
              <CardContent><TrendChart points={trend} /><Link href="/application" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">View application pipeline <ArrowRight className="h-4 w-4" /></Link></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Pipeline health</CardTitle><CardDescription>Where your active cases are now</CardDescription></CardHeader>
              <CardContent className="space-y-3">{pipeline.map((stage) => <PipelineRow key={stage} label={stage.replace(/_/g, " ")} value={stageCount.get(stage) ?? 0} max={pipelineMax} />)}<Link href="/application" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">Manage pipeline <ArrowRight className="h-4 w-4" /></Link></CardContent>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Recent application activity</CardTitle><CardDescription>Latest updates across your portfolio</CardDescription></div><Link href="/application" className="text-sm font-semibold text-brand-600 hover:underline">View all</Link></CardHeader>
              <CardContent>{recentApps.length === 0 ? <EmptyState text="Applications will appear here as soon as students start applying." href="/application" label="Open applications" /> : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{recentApps.map((application) => <li key={application.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"><GraduationCap className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{application.student.firstName} {application.student.lastName}</p><p className="truncate text-xs text-slate-500">{application.program.name} · {application.program.university.name}</p></div><div className="text-right"><Badge tone={application.stage === "REJECTED" ? "red" : application.stage === "OFFER" || application.stage === "ENROLLED" ? "green" : "brand"}>{application.stage.replace(/_/g, " ")}</Badge><p className="mt-1 text-[11px] text-slate-400">{formatDate(application.updatedAt)}</p></div></li>)}</ul>}</CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Workspace tools</CardTitle><CardDescription>Common actions for today</CardDescription></CardHeader>
              <CardContent className="grid gap-2">{quickActions.map((action) => <Link key={action.href} href={action.href} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/15"><span className="rounded-lg bg-slate-100 p-2 text-slate-600 transition group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-brand-900/40 dark:group-hover:text-brand-200"><action.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{action.label}</span><span className="block truncate text-xs text-slate-500">{action.detail}</span></span><ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" /></Link>)}</CardContent>
            </Card>
          </div>

          {user.role === "SUPER_ADMIN" && <section aria-label="Administration metrics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Total students" value={totalStudents} hint="All active records" icon={Users} tone="brand" href="/users" /><MetricCard label="Active programs" value={activePrograms} hint="Catalog availability" icon={GraduationCap} tone="cyan" href="/programs" /><MetricCard label="Course enrollments" value={courseEnrollments} hint="Enrolled or completed" icon={BookOpen} tone="violet" href="/short-courses" /><MetricCard label="Recorded revenue" value={revenueSummary} hint="Excluding refunds" icon={WalletCards} tone="amber" href="/transaction" /></section>}
        </div>
        <aside className="hidden xl:block"><DashboardAdRail id="dashboard-advertisements" ads={advertisements} canManage={user.role === "SUPER_ADMIN"} /></aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, hint, icon: Icon, tone, href }: { label: string; value: string | number; hint: string; icon: typeof Users; tone: "brand" | "amber" | "cyan" | "violet"; href: string | null }) {
  const colors = { brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200", amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200", cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200", violet: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-200" };
  const content = <Card className="h-full transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"><CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div><span className={`rounded-xl p-2.5 ${colors[tone]}`}><Icon className="h-5 w-5" /></span></CardContent></Card>;
  return href ? <Link href={href}>{content}</Link> : content;
}

function PipelineRow({ label, value, max }: { label: string; value: number; max: number }) {
  return <div><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="font-medium text-slate-600 dark:text-slate-300">{label}</span><span className="font-semibold">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500" style={{ width: `${value ? Math.max(8, Math.round((value / max) * 100)) : 0}%` }} /></div></div>;
}

function TrendChart({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const coords = points.map((point, index) => `${index * 20 + 5},${90 - (point.value / max) * 66}`).join(" ");
  return <div aria-label="Applications over the last six months" role="img"><svg viewBox="0 0 110 108" className="h-44 w-full overflow-visible sm:h-52" preserveAspectRatio="none"><defs><linearGradient id="home-trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity=".28" /><stop offset="1" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs><line x1="5" x2="105" y1="90" y2="90" stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="2 3" /><polyline points={`5,90 ${coords} 105,90`} fill="url(#home-trend-fill)" stroke="none" /><polyline points={coords} fill="none" stroke="#2563eb" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />{points.map((point, index) => <g key={point.label}><circle cx={index * 20 + 5} cy={90 - (point.value / max) * 66} r="2.5" fill="#2563eb" /><text x={index * 20 + 5} y="104" textAnchor="middle" fontSize="6" fill="currentColor">{point.label}</text></g>)}</svg><div className="mt-1 flex justify-between text-xs text-slate-500"><span>0 applications</span><span>{max} monthly peak</span></div></div>;
}

function EmptyState({ text, href, label }: { text: string; href: string; label: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700"><CheckCircle2 className="mx-auto h-6 w-6 text-slate-400" /><p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">{text}</p><Link href={href} className="mt-3 inline-flex text-sm font-semibold text-brand-600 hover:underline">{label}</Link></div>;
}
