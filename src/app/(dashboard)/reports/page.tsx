import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, toNum } from "@/lib/utils";
import type { TransactionType } from "@/generated/prisma/client";
import { ReportActions } from "@/components/report-actions";

export const metadata = { title: "Reports" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await currentUser();
  if (!user || user.role === "STUDENT" || user.role === "COUNSELOR") redirect("/");

  const params = await searchParams;
  const period = ["30", "90", "365", "all"].includes(params.period ?? "") ? params.period! : "30";
  const startDate = period === "all" ? undefined : new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);
  const dateFilter = startDate ? { gte: startDate } : undefined;
  const studentScope = studentScopeWhere(user);
  const studentWhere = { AND: [studentScope, ...(dateFilter ? [{ createdAt: dateFilter }] : [])] };
  const applicationWhere = { student: studentScope, ...(dateFilter ? { createdAt: dateFilter } : {}) };
  const transactionScope =
    user.role === "SUPER_ADMIN"
      ? {}
      : user.role === "MANAGER"
        ? { relatedStudent: studentScope }
        : user.role === "AGENCY"
      ? { OR: [{ relatedStudent: studentScope }, { relatedAgencyId: user.id }] }
      : {};

  const [students, applications, programs, transactions] = await Promise.all([
    prisma.user.count({ where: studentWhere }),
    prisma.application.count({ where: applicationWhere }),
    prisma.program.count(),
    prisma.transaction.groupBy({ by: ["currency", "type"], where: { AND: [transactionScope, ...(dateFilter ? [{ date: dateFilter }] : [])] }, _sum: { amount: true } }),
  ]);

  const byStage = await prisma.application.groupBy({ by: ["stage"], where: applicationWhere, _count: { _all: true } });
  const byCountry = await prisma.user.groupBy({ by: ["country"], where: { AND: [studentWhere, { country: { not: null } }] }, _count: { _all: true } });

  const volumeByCurrency = transactions.reduce<Record<string, number>>((totals, transaction) => {
    const amount = toNum(transaction._sum.amount);
    totals[transaction.currency] = (totals[transaction.currency] ?? 0) + (transaction.type === "REFUND" ? -amount : amount);
    return totals;
  }, {});
  const volume = Object.entries(volumeByCurrency).map(([currency, amount]) => formatCurrency(amount, currency)).join(" · ") || "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-ink-muted">Operational summaries for the selected period.</p>
        </div>
        <ReportActions period={period} />
      </div>

      <form method="get" className="flex flex-wrap items-center gap-2"><label htmlFor="report-period" className="text-sm font-medium">Date range</label><select id="report-period" name="period" defaultValue={period} className="min-h-9 rounded-lg border border-line-strong px-3 text-sm"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option><option value="all">All time</option></select><button className="min-h-9 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white">Apply range</button></form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-ink-muted">Students</p><p className="mt-1 text-2xl font-bold">{students}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-ink-muted">Applications</p><p className="mt-1 text-2xl font-bold">{applications}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-ink-muted">Programs</p><p className="mt-1 text-2xl font-bold">{programs}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-ink-muted">Total volume</p><p className="mt-1 text-xl font-bold">{volume}</p><p className="mt-1 text-xs text-ink-muted">Grouped by currency</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Applications by stage</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {byStage.length === 0 ? <li className="text-ink-muted">No applications in this scope yet.</li> : byStage.map((r) => (
                <li key={r.stage} className="flex justify-between">
                  <span className="capitalize text-ink-muted dark:text-slate-300">{r.stage.replace(/_/g, " ")}</span>
                  <span className="font-medium">{r._count._all}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Students by country</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {byCountry.length === 0 ? <li className="text-ink-muted">No country information recorded yet.</li> : byCountry.map((r) => (
                <li key={r.country} className="flex justify-between">
                  <span>{r.country}</span>
                  <span className="font-medium">{r._count._all}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
