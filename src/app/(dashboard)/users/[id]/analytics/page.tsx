import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

export default async function UserAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser(); if (!actor) redirect("/"); const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, include: { applications: { select: { stage: true, createdAt: true } }, studentTransactions: { select: { amount: true, type: true, date: true } }, notifications: { select: { createdAt: true } }, shortCourseEnrollments: { select: { status: true } } } });
  if (!user) return <Card><CardContent className="p-8 text-center">User not found.</CardContent></Card>;
  const spent = user.studentTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">{user.firstName} {user.lastName} analytics</h1><p className="text-sm text-slate-500">Applications, payments, course engagement, and activity history.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Applications" value={user.applications.length}/><Metric label="Transactions" value={user.studentTransactions.length}/><Metric label="Recorded payments" value={`MYR ${spent.toLocaleString()}`}/><Metric label="Course enrollments" value={user.shortCourseEnrollments.length}/></div><Card><CardContent className="p-5"><h2 className="font-semibold">Application breakdown</h2><div className="mt-4 flex flex-wrap gap-2">{Object.entries(user.applications.reduce<Record<string, number>>((a, x) => { a[x.stage] = (a[x.stage] ?? 0) + 1; return a; }, {})).map(([stage, count]) => <span key={stage} className="rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">{stage.replace(/_/g, " ")}: <b>{count}</b></span>)}</div></CardContent></Card></div>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <Card><CardContent className="p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }
