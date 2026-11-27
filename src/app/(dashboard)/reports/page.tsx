import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, BookOpen, Building2, FileCheck2, FileText, GraduationCap, Users, Wallet } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, humanize, toNum } from "@/lib/utils";
import { ReportActions } from "@/components/report-actions";
import type { ApplicationStage, Prisma } from "@/generated/prisma/client";

export const metadata = { title: "Reports & analytics" };
const STAGES: ApplicationStage[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER", "DEPOSIT_PAID", "VISA", "ENROLLED", "REJECTED", "WITHDRAWN"];
const BAR_COLORS = ["bg-blue-600", "bg-violet-600", "bg-indigo-500", "bg-sky-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-600", "bg-slate-500"];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await currentUser();
  if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "MANAGER")) redirect("/");
  const params = await searchParams;
  const period = ["30", "90", "365", "all"].includes(params.period ?? "") ? params.period! : "30";
  const now = new Date();
  const startDate = period === "all" ? undefined : new Date(now.getTime() - Number(period) * 86400000);
  const dateFilter = startDate ? { gte: startDate } : undefined;
  const studentScope = studentScopeWhere(user);
  const studentWhere: Prisma.UserWhereInput = { AND: [studentScope, ...(dateFilter ? [{ createdAt: dateFilter }] : [])] };
  const allScopedStudents: Prisma.UserWhereInput = studentScope;
  const applicationWhere: Prisma.ApplicationWhereInput = { student: studentScope, ...(dateFilter ? { createdAt: dateFilter } : {}) };
  const transactionWhere: Prisma.TransactionWhereInput = {
    ...(user.role === "MANAGER" ? { relatedStudent: studentScope } : {}),
    ...(dateFilter ? { date: dateFilter } : {}),
  };
  const enrollmentWhere: Prisma.ShortCourseEnrollmentWhereInput = {
    student: studentScope,
    ...(dateFilter ? { enrolledAt: dateFilter } : {}),
  };
  const documentWhere: Prisma.DocumentWhereInput = { owner: studentScope, ...(dateFilter ? { uploadedAt: dateFilter } : {}) };
  const trendStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const trendWhere: Prisma.ApplicationWhereInput = { student: studentScope, createdAt: { gte: startDate && startDate > trendStart ? startDate : trendStart } };

  const [students, allStudents, applications, allApplications, programs, universities, scholarships, activeScholarships, activeCourses, enrollments, documents, transactions, stageRows, countryRows, enrollmentRows, documentRows, trendRows, topPrograms, recentApplications, partnerCount, pendingPartnerCount] = await Promise.all([
    prisma.user.count({ where: studentWhere }),
    prisma.user.count({ where: allScopedStudents }),
    prisma.application.count({ where: applicationWhere }),
    prisma.application.count({ where: { student: studentScope } }),
    prisma.program.count(),
    prisma.university.count(),
    prisma.scholarship.count(),
    prisma.scholarship.count({ where: { isActive: true } }),
    prisma.shortCourse.count({ where: { status: "active" } }),
    prisma.shortCourseEnrollment.count({ where: enrollmentWhere }),
    prisma.document.count({ where: documentWhere }),
    prisma.transaction.groupBy({ by: ["currency", "type"], where: transactionWhere, _sum: { amount: true }, _count: { _all: true } }),
    prisma.application.groupBy({ by: ["stage"], where: applicationWhere, _count: { _all: true } }),
    prisma.user.groupBy({ by: ["country"], where: { AND: [studentWhere, { country: { not: null } }] }, _count: { _all: true } }),
    prisma.shortCourseEnrollment.groupBy({ by: ["status"], where: enrollmentWhere, _count: { _all: true } }),
    prisma.document.groupBy({ by: ["status"], where: documentWhere, _count: { _all: true } }),
    prisma.application.findMany({ where: trendWhere, select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 10000 }),
    prisma.application.groupBy({ by: ["programId"], where: applicationWhere, _count: { _all: true }, orderBy: { _count: { programId: "desc" } }, take: 8 }),
    prisma.application.findMany({ where: applicationWhere, select: { id: true, stage: true, createdAt: true, student: { select: { firstName: true, lastName: true, email: true } }, program: { select: { name: true, university: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.user.count({ where: { role: "AGENCY" } }),
    prisma.user.count({ where: { role: "AGENCY", status: "pending" } }),
  ]);
  const topProgramRows = await prisma.program.findMany({ where: { id: { in: topPrograms.map((row) => row.programId) } }, select: { id: true, name: true, university: { select: { name: true } } } });
  const topProgramMap = new Map(topProgramRows.map((program) => [program.id, program]));
  const stageCounts = new Map(stageRows.map((row) => [row.stage, row._count._all]));
  const stages = STAGES.map((stage) => ({ label: humanize(stage), value: stageCounts.get(stage) ?? 0 }));
  const countries = countryRows.filter((row) => row.country).map((row) => ({ label: row.country!, value: row._count._all })).sort((a, b) => b.value - a.value).slice(0, 8);
  const enrollmentStats = enrollmentRows.map((row) => ({ label: humanize(row.status), value: row._count._all })).sort((a, b) => b.value - a.value);
  const documentStats = documentRows.map((row) => ({ label: humanize(row.status), value: row._count._all })).sort((a, b) => b.value - a.value);
  const monthLabels = Array.from({ length: 12 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1));
  const monthlyCounts = new Map<string, number>();
  for (const application of trendRows) {
    const key = `${application.createdAt.getFullYear()}-${application.createdAt.getMonth()}`;
    monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + 1);
  }
  const monthly = monthLabels.map((month) => ({ label: month.toLocaleDateString("en", { month: "short", year: "2-digit" }), value: monthlyCounts.get(`${month.getFullYear()}-${month.getMonth()}`) ?? 0 }));
  const maxMonthly = Math.max(1, ...monthly.map((entry) => entry.value));
  const byCurrency = new Map<string, { amount: number; count: number }>();
  for (const row of transactions) {
    const current = byCurrency.get(row.currency) ?? { amount: 0, count: 0 };
    current.amount += (row.type === "REFUND" ? -1 : 1) * toNum(row._sum.amount);
    current.count += row._count._all;
    byCurrency.set(row.currency, current);
  }
  const paymentSummary = [...byCurrency.entries()].map(([currency, data]) => ({ currency, ...data }));
  const paymentTypeTotals = transactions.reduce<Record<string, number>>((acc, row) => {
    acc[row.type] = (acc[row.type] ?? 0) + row._count._all;
    return acc;
  }, {});
  const periodLabel = period === "all" ? "All time" : period === "365" ? "Last 12 months" : `Last ${period} days`;

  return <div className="space-y-6 pb-8 print:space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-gradient-to-br from-navy-950 via-[#263b78] to-[#5b3aab] p-6 text-white shadow-sm sm:p-8 print:bg-white print:p-0 print:text-black print:shadow-none">
      <div><p className="text-sm font-semibold text-blue-100 print:text-slate-600">Operational overview · {periodLabel}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Reports &amp; analytics</h1><p className="mt-2 max-w-2xl text-base leading-7 text-blue-50 print:text-slate-600">Monitor students, application progress, catalog activity, payments and course engagement in one place.</p></div>
      <ReportActions period={period} />
    </header>
    <form method="get" className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-navy-700 dark:bg-navy-900 print:hidden"><div><label htmlFor="report-period" className="text-sm font-semibold">Reporting period</label><select id="report-period" name="period" defaultValue={period} className="mt-1 block min-h-10 min-w-52 rounded-lg border border-line-strong bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-900"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option><option value="all">All time</option></select></div><button className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">Update report</button></form>

    <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Users} label="New students" value={students} detail={`${allStudents} total in scope`} />
      <Metric icon={FileText} label="Applications created" value={applications} detail={`${allApplications} total in scope`} />
      <Metric icon={GraduationCap} label="Programs" value={programs} detail={`${universities} universities`} />
      <Metric icon={Award} label="Scholarships" value={scholarships} detail={`${activeScholarships} active`} />
      <Metric icon={BookOpen} label="Active short courses" value={activeCourses} detail={`${enrollments} enrollments in period`} />
      <Metric icon={FileCheck2} label="Student documents" value={documents} detail="Uploaded in selected period" />
      <Metric icon={Wallet} label="Recorded transactions" value={transactions.reduce((sum, row) => sum + row._count._all, 0)} detail={`${paymentSummary.length} currencies`} />
      <Metric icon={Building2} label="Partner institutions" value={partnerCount} detail={`${pendingPartnerCount} pending approval`} />
    </section>

    <section className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle>Application activity</CardTitle><p className="mt-1 text-sm text-ink-muted">Applications created per month over the last 12 months.</p></CardHeader><CardContent><div className="flex h-64 items-end gap-2 border-b border-line px-1 pt-5 dark:border-navy-700" role="img" aria-label={`Monthly application counts: ${monthly.map((item) => `${item.label}: ${item.value}`).join(", ")}`}>
        {monthly.map((item) => <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-semibold text-ink-muted">{item.value}</span><div className="w-full max-w-10 rounded-t-md bg-gradient-to-t from-blue-700 to-violet-500 transition-all" style={{ height: `${item.value === 0 ? 3 : Math.max(8, item.value / maxMonthly * 100)}%` }} /><span className="pb-2 text-center text-[10px] leading-tight text-ink-muted">{item.label}</span></div>)}
      </div></CardContent></Card>
      <Card><CardHeader><CardTitle>Applications by stage</CardTitle><p className="mt-1 text-sm text-ink-muted">{applications} applications in {periodLabel.toLowerCase()}.</p></CardHeader><CardContent><BarList items={stages} /></CardContent></Card>
      <Card><CardHeader><CardTitle>Students by country</CardTitle><p className="mt-1 text-sm text-ink-muted">Top countries by students registered in the selected period.</p></CardHeader><CardContent>{countries.length ? <BarList items={countries} /> : <Empty>No student country information is available for this period.</Empty>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Payments by currency</CardTitle><p className="mt-1 text-sm text-ink-muted">Totals stay separated by currency to avoid misleading conversion.</p></CardHeader><CardContent>{paymentSummary.length ? <div className="space-y-3">{paymentSummary.map((item) => <div key={item.currency} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-4 dark:border-navy-700"><div><p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{item.currency}</p><p className="mt-1 text-xl font-bold">{formatCurrency(item.amount, item.currency)}</p></div><div className="text-right"><p className="text-sm font-semibold">{item.count} transactions</p><p className="text-xs text-ink-muted">{Object.entries(paymentTypeTotals).map(([type, count]) => `${humanize(type)} ${count}`).join(" · ")}</p></div></div>)}</div> : <Empty>No transactions were recorded in this period.</Empty>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Short-course enrollments</CardTitle><p className="mt-1 text-sm text-ink-muted">Enrollment pipeline by current status.</p></CardHeader><CardContent>{enrollmentStats.length ? <BarList items={enrollmentStats} /> : <Empty>No short-course enrollments were recorded in this period.</Empty>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Document review status</CardTitle><p className="mt-1 text-sm text-ink-muted">Student document uploads during the selected period.</p></CardHeader><CardContent>{documentStats.length ? <BarList items={documentStats} /> : <Empty>No student documents were uploaded in this period.</Empty>}</CardContent></Card>
    </section>

    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card><CardHeader><CardTitle>Most applied-to programs</CardTitle></CardHeader><CardContent>{topPrograms.length ? <ol className="divide-y divide-line dark:divide-navy-700">{topPrograms.map((item, index) => { const program = topProgramMap.get(item.programId); return <li key={item.programId} className="flex items-center gap-3 py-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{program?.name ?? "Program"}</p><p className="truncate text-xs text-ink-muted">{program?.university.name ?? "University"}</p></div><Badge tone="brand">{item._count._all} applications</Badge></li>; })}</ol> : <Empty>No applications are available for ranking in this period.</Empty>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Recent applications</CardTitle><p className="mt-1 text-sm text-ink-muted">Latest records in your reporting scope.</p></CardHeader><CardContent>{recentApplications.length ? <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-sm"><caption className="sr-only">Recent applications in this reporting scope</caption><thead><tr className="border-b border-line text-xs uppercase text-ink-muted dark:border-navy-700"><th scope="col" className="py-2 pr-3">Student</th><th scope="col" className="py-2 pr-3">Program</th><th scope="col" className="py-2 pr-3">Stage</th><th scope="col" className="py-2">Created</th></tr></thead><tbody className="divide-y divide-line dark:divide-navy-700">{recentApplications.map((row) => <tr key={row.id}><td className="py-3 pr-3"><p className="font-semibold">{row.student.firstName} {row.student.lastName}</p><p className="text-xs text-ink-muted">{row.student.email}</p></td><td className="py-3 pr-3"><p className="font-medium">{row.program.name}</p><p className="text-xs text-ink-muted">{row.program.university.name}</p></td><td className="py-3 pr-3"><Badge tone={row.stage === "ENROLLED" || row.stage === "OFFER" ? "green" : row.stage === "REJECTED" ? "red" : "brand"}>{humanize(row.stage)}</Badge></td><td className="whitespace-nowrap py-3 text-ink-muted">{formatDate(row.createdAt)}</td></tr>)}</tbody></table></div> : <Empty>No applications were recorded in this period.</Empty>}</CardContent></Card>
    </section>
    <Card className="print:hidden"><CardHeader><CardTitle>Downloads and sharing</CardTitle><p className="mt-1 text-sm text-ink-muted">Download scoped records as CSV or use your browser’s print dialog to save this dashboard as PDF.</p></CardHeader><CardContent><ReportActions period={period} expanded /></CardContent></Card>
    <p className="text-xs text-ink-muted">Student and application statistics follow your reporting access scope. Catalog totals are system-wide. Payment totals are grouped by their original currency.</p>
  </div>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Users; label: string; value: string | number; detail: string }) {
  return <Card><CardContent className="flex items-start gap-3 p-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-violet-100 text-brand-700 dark:from-blue-950 dark:to-violet-950 dark:text-brand-200"><Icon aria-hidden className="h-5 w-5" /></span><div className="min-w-0"><p className="text-sm text-ink-muted">{label}</p><p className="mt-0.5 text-2xl font-bold tracking-tight">{value.toLocaleString()}</p><p className="mt-1 text-xs text-ink-muted">{detail}</p></div></CardContent></Card>;
}

function BarList({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return <ul className="space-y-3" role="list">{items.map((item, index) => <li key={item.label} aria-label={`${item.label}: ${item.value}`}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate text-ink-muted">{item.label}</span><span className="font-semibold tabular-nums">{item.value.toLocaleString()}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-canvas-subtle dark:bg-navy-800"><div className={`h-full rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`} style={{ width: `${item.value ? Math.max(2, item.value / max * 100) : 0}%` }} /></div></li>)}</ul>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line-strong px-4 py-8 text-center text-sm text-ink-muted dark:border-navy-700">{children}</p>;
}
