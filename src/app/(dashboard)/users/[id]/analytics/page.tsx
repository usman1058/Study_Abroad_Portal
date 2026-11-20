import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, humanize } from "@/lib/utils";

export default async function UserAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentUser(); if (!actor) redirect("/");
  // Payment/application analytics are not visible to partner roles.
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "MANAGER") redirect("/users");
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, include: { applications: { select: { stage: true, createdAt: true } }, studentTransactions: { select: { amount: true, type: true, currency: true, date: true } }, notifications: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 }, shortCourseEnrollments: { select: { status: true } } } });
  if (!user) return <Card><CardContent className="p-8 text-center">User not found.</CardContent></Card>;
  if (user.role !== "STUDENT") return <Card><CardContent className="p-8 text-center text-ink-muted">Analytics are only available for students.</CardContent></Card>;
  const totals = new Map<string, number>();
  for (const t of user.studentTransactions) {
    if (t.type === "REFUND") continue;
    totals.set(t.currency, (totals.get(t.currency) ?? 0) + Number(t.amount));
  }
  const spent = [...totals].map(([currency, amount]) => formatCurrency(amount, currency)).join(" · ") || formatCurrency(0);
  const breakdown = Object.entries(user.applications.reduce<Record<string, number>>((counts, application) => { counts[application.stage] = (counts[application.stage] ?? 0) + 1; return counts; }, {}));
  const latestActivity = user.notifications[0]?.createdAt;
  return <div className="space-y-6"><div><h1 className="text-2xl font-bold">Student analytics</h1><p className="text-sm text-ink-muted">{user.firstName} {user.lastName} · activity, applications, payments, and course engagement.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Applications" value={user.applications.length}/><Metric label="Transactions" value={user.studentTransactions.length}/><Metric label="Recorded payments" value={spent}/><Metric label="Course enrollments" value={user.shortCourseEnrollments.length}/></div><Card><CardContent className="p-5"><h2 className="font-semibold">Application breakdown</h2>{breakdown.length === 0 ? <p className="mt-3 text-sm text-ink-muted">No applications have been recorded.</p> : <div className="mt-4 flex flex-wrap gap-2">{breakdown.map(([stage, count]) => <span key={stage} className="rounded-lg bg-canvas-subtle px-3 py-2 text-sm dark:bg-navy-800">{humanize(stage)}: <b>{count}</b></span>)}</div>}</CardContent></Card><Card><CardContent className="p-5"><h2 className="font-semibold">Recent activity</h2><p className="mt-2 text-sm text-ink-muted">{latestActivity ? `Latest notification: ${formatDate(latestActivity)}` : "No notifications have been recorded."}</p></CardContent></Card></div>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <Card><CardContent className="p-5"><p className="text-xs text-ink-muted">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }
