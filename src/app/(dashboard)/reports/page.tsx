import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, toNum } from "@/lib/utils";
import type { TransactionType } from "@/generated/prisma/client";
import { ReportActions } from "@/components/report-actions";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT" || user.role === "COUNSELOR") redirect("/");

  const studentScope = studentScopeWhere(user);
  const transactionScope =
    user.role === "AGENCY"
      ? { OR: [{ relatedStudent: studentScope }, { relatedAgencyId: user.id }, { relatedAgency: { parentAgencyId: user.id } }] }
      : {};

  const [students, applications, programs, transactions] = await Promise.all([
    prisma.user.count({ where: studentScope }),
    prisma.application.count({ where: { student: studentScope } }),
    prisma.program.count(),
    prisma.transaction.findMany({ where: transactionScope, select: { amount: true, type: true, currency: true } }),
  ]);

  const byStage = await prisma.application.groupBy({ by: ["stage"], where: { student: studentScope }, _count: { _all: true } });
  const byCountry = await prisma.user.groupBy({ by: ["country"], where: { ...studentScope, country: { not: null } }, _count: { _all: true } });

  const volumeByCurrency = transactions.reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.currency] = (totals[transaction.currency] ?? 0) + (transaction.type === "REFUND" ? -toNum(transaction.amount) : toNum(transaction.amount));
    return totals;
  }, {});
  const volume = Object.entries(volumeByCurrency).map(([currency, amount]) => formatCurrency(amount, currency)).join(" · ") || "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-slate-500">Operational summaries.</p>
        </div>
        <ReportActions />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Students</p><p className="mt-1 text-2xl font-bold">{students}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Applications</p><p className="mt-1 text-2xl font-bold">{applications}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Programs</p><p className="mt-1 text-2xl font-bold">{programs}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total volume</p><p className="mt-1 text-xl font-bold">{volume}</p><p className="mt-1 text-xs text-slate-400">Grouped by currency</p></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Applications by stage</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {byStage.map((r) => (
                <li key={r.stage} className="flex justify-between">
                  <span className="capitalize text-slate-600 dark:text-slate-300">{r.stage.replace(/_/g, " ")}</span>
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
              {byCountry.map((r) => (
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
