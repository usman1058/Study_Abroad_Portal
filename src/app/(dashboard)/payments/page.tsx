import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, fullName, toNum } from "@/lib/utils";

export const metadata = { title: "Payments" };

function typeTone(type: string): "green" | "brand" | "amber" | "red" | "slate" {
  if (type === "refund") return "amber";
  if (type === "commission_payout") return "green";
  if (type === "deposit") return "brand";
  return "slate";
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  card: "Card",
  online: "Online payment",
};

export default async function PaymentsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  if (user.role === "STUDENT") {
    const transactions = await prisma.transaction.findMany({
      where: { relatedStudentId: user.id },
      orderBy: { date: "desc" },
      include: {
        relatedApplication: { include: { program: { include: { university: true } } } },
        enteredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const total = transactions.reduce((s, t) => s + toNum(t.amount), 0);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-slate-500">
            Your payment history. Each entry shows what the payment is for.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500">Total recorded</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(total)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500">Payments made</p>
              <p className="mt-1 text-2xl font-bold">{transactions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-slate-500">Balance due (est.)</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">
                {formatCurrency(transactions.reduce((s, t) => s + (t.type === "refund" ? -toNum(t.amount) : 0), total))}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>History</CardTitle></CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No payments recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                      <th className="p-4">Date</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Details</th>
                      <th className="p-4">Method</th>
                      <th className="p-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="p-4 text-slate-500">{formatDate(t.date)}</td>
                        <td className="p-4"><Badge tone={typeTone(t.type)}>{t.type.replace(/_/g, " ")}</Badge></td>
                        <td className="p-4">
                          <p className="font-medium">{t.notes || t.type.replace(/_/g, " ")}</p>
                          {t.relatedApplication ? (
                            <p className="text-xs text-slate-500">
                              {t.relatedApplication.program.university.name} — {t.relatedApplication.program.name}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400">General payment</p>
                          )}
                        </td>
                        <td className="p-4 text-slate-500">{t.method ? METHOD_LABELS[t.method] ?? t.method : "—"}</td>
                        <td className="p-4 text-right font-medium">{formatCurrency(t.amount, t.currency)}</td>
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

  // Partner view — payments across students.
  const transactions = await prisma.transaction.findMany({
    where: { relatedStudentId: { not: null } },
    orderBy: { date: "desc" },
    take: 100,
    include: {
      relatedStudent: { select: { id: true, firstName: true, lastName: true } },
      relatedApplication: { include: { program: { select: { name: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-slate-500">Student payments across all cases.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent payments</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No payments yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-4">Student</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Details</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="p-4 font-medium">{t.relatedStudent ? fullName(t.relatedStudent) : "—"}</td>
                      <td className="p-4"><Badge tone={typeTone(t.type)}>{t.type.replace(/_/g, " ")}</Badge></td>
                      <td className="p-4">
                        <p>{t.notes || "—"}</p>
                        {t.relatedApplication && (
                          <p className="text-xs text-slate-500">{t.relatedApplication.program.name}</p>
                        )}
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(t.amount, t.currency)}</td>
                      <td className="p-4 text-slate-500">{formatDate(t.date)}</td>
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