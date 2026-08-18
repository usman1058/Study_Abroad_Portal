import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, toNum } from "@/lib/utils";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT" || user.role === "COUNSELOR") redirect("/");

  const [students, applications, programs, documents, transactions, shortCourses, enrollments] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.application.count(),
    prisma.program.count(),
    prisma.document.count(),
    prisma.transaction.findMany({ select: { amount: true, type: true, currency: true } }),
    prisma.shortCourse.count(),
    prisma.shortCourseEnrollment.count(),
  ]);

  const byStage = await prisma.application.groupBy({ by: ["stage"], _count: { _all: true } });
  const byCountry = await prisma.user.groupBy({ by: ["country"], where: { role: "STUDENT", country: { not: null } }, _count: { _all: true } });

  const totalRevenue = transactions.reduce((s, t) => s + (t.type === "refund" ? -toNum(t.amount) : toNum(t.amount)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-slate-500">Operational summaries.</p>
        </div>
        <a href="/api/reports/export" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
          <Download className="h-4 w-4" /> Export CSV
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Students</p><p className="mt-1 text-2xl font-bold">{students}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Applications</p><p className="mt-1 text-2xl font-bold">{applications}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Programs</p><p className="mt-1 text-2xl font-bold">{programs}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total volume</p><p className="mt-1 text-2xl font-bold">{formatCurrency(totalRevenue)}</p></CardContent></Card>
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