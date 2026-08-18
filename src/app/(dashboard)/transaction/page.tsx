import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TransactionForm } from "@/components/transaction-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, fullName, toNum } from "@/lib/utils";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const where =
    user.role === "AGENCY"
      ? { OR: [{ relatedAgencyId: user.id }, { relatedStudent: { createdById: user.id } }] }
      : user.role === "COUNSELOR"
        ? { relatedStudent: { assignedCounselorId: user.id } }
        : {};

  const [transactions, students, agencies] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: 100,
      include: {
        relatedStudent: { select: { id: true, firstName: true, lastName: true } },
        relatedAgency: { select: { id: true, firstName: true, lastName: true, companyName: true } },
        enteredBy: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.user.findMany({ where: { role: "STUDENT" }, select: { id: true, firstName: true, lastName: true } }),
    prisma.user.findMany({ where: { role: "AGENCY" }, select: { id: true, firstName: true, lastName: true, companyName: true } }),
  ]);

  const totals = transactions.reduce(
    (acc, t) => {
      acc[t.type] = (acc[t.type] ?? 0) + toNum(t.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-slate-500">Financial ledger — manually entered in v1.</p>
        </div>
        <TransactionForm
          students={students.map((s) => ({ id: s.id, label: `${s.firstName} ${s.lastName}` }))}
          agencies={agencies.map((a) => ({ id: a.id, label: `${a.companyName ?? `${a.firstName} ${a.lastName}`}` }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(totals).map(([type, amount]) => (
          <Card key={type}>
            <CardContent className="p-5">
              <p className="text-xs capitalize text-slate-500">{type.replace(/_/g, " ")}</p>
              <p className="mt-1 text-lg font-bold">{formatCurrency(amount)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Method</th>
                    <th className="p-4">Student</th>
                    <th className="p-4">Agency</th>
                    <th className="p-4">Notes</th>
                    <th className="p-4">Entered by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="p-4 text-slate-500">{formatDate(t.date)}</td>
                      <td className="p-4"><Badge tone={t.type === "refund" ? "red" : t.type === "commission_payout" ? "green" : "brand"}>{t.type.replace(/_/g, " ")}</Badge></td>
                      <td className="p-4 font-medium">{formatCurrency(t.amount, t.currency)}</td>
                      <td className="p-4 text-slate-500">{(t.method ?? "—").replace(/_/g, " ")}</td>
                      <td className="p-4">{t.relatedStudent ? fullName(t.relatedStudent) : "—"}</td>
                      <td className="p-4">{t.relatedAgency ? (t.relatedAgency.companyName ?? fullName(t.relatedAgency)) : "—"}</td>
                      <td className="p-4 text-slate-500">{t.notes ?? "—"}</td>
                      <td className="p-4 text-slate-500">{t.enteredBy.firstName} {t.enteredBy.lastName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}