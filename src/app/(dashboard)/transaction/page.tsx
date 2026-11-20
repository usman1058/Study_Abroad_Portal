import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { TransactionForm } from "@/components/transaction-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, fullName, humanize, toNum } from "@/lib/utils";
import { TRANSACTION_TYPES } from "@/lib/constants";
import type { TransactionType } from "@/generated/prisma/client";
import { DeleteButton } from "@/components/delete-button";

export const metadata = { title: "Transactions" };
const PAGE_SIZE = 25;

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ page?: string; type?: string }> }) {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const studentScope = studentScopeWhere(user);
  const where =
    user.role === "AGENCY"
      ? { OR: [{ relatedAgencyId: user.id }, { relatedStudent: studentScope }] }
      : user.role === "SUPER_ADMIN" || user.role === "MANAGER"
        ? {}
        : { relatedStudent: studentScope };
  const agenciesWhere =
    user.role === "AGENCY"
      ? { id: user.id }
      : user.role === "COUNSELOR"
        ? { id: { in: [] as string[] } }
        : { role: "AGENCY" as const };

  const params = await searchParams;
  const type: TransactionType | "" = TRANSACTION_TYPES.includes(params.type ?? "") ? params.type as TransactionType : "";
  const listWhere = { ...where, ...(type ? { type } : {}) };
  const parsedPage = Number(params.page);
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [total, allTotal, totals, typeCounts, students, agencies] = await Promise.all([
    prisma.transaction.count({ where: listWhere }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({ by: ["type", "currency"], where, _sum: { amount: true } }),
    prisma.transaction.groupBy({ by: ["type"], where, _count: { _all: true } }),
    prisma.user.findMany({ where: studentScope, select: { id: true, firstName: true, lastName: true } }),
    prisma.user.findMany({ where: agenciesWhere, select: { id: true, firstName: true, lastName: true, companyName: true } }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total > 0 && requestedPage > pageCount) {
    const query = new URLSearchParams();
    if (type) query.set("type", type);
    if (pageCount > 1) query.set("page", String(pageCount));
    redirect(query.size ? `/transaction?${query.toString()}` : "/transaction");
  }
  const currentPage = requestedPage;
  const transactions = await prisma.transaction.findMany({
    where: listWhere,
    orderBy: [{ date: "desc" }, { id: "desc" }],
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      relatedStudent: { select: { id: true, firstName: true, lastName: true } },
      relatedAgency: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      enteredBy: { select: { firstName: true, lastName: true } },
    },
  });
  const query = (extra: Record<string, string | number | undefined>) => {
    const next = new URLSearchParams();
    const nextType = Object.prototype.hasOwnProperty.call(extra, "type") ? extra.type : type;
    if (nextType) next.set("type", String(nextType));
    for (const [key, value] of Object.entries(extra)) if (value !== undefined && value !== "") next.set(key, String(value));
    return next.size ? `/transaction?${next.toString()}` : "/transaction";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-ink-muted">Financial ledger. Staff record payments and refunds here; no online payment is collected by this page.</p>
        </div>
        <TransactionForm
          students={students.map((s) => ({ id: s.id, label: `${s.firstName} ${s.lastName}` }))}
          agencies={agencies.map((a) => ({ id: a.id, label: `${a.companyName ?? `${a.firstName} ${a.lastName}`}` }))}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {totals.map((row) => {
          const amount = toNum(row._sum.amount);
          return <Card key={`${row.type}:${row.currency}`}>
            <CardContent className="p-5">
              <p className="text-xs text-ink-muted">{humanize(row.type)} · {row.currency}</p>
              <p className="mt-1 text-lg font-bold">{formatCurrency(amount, row.currency)}</p>
            </CardContent>
          </Card>;
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3"><CardTitle>Ledger</CardTitle><nav aria-label="Transaction type" className="flex flex-wrap gap-2">
            <Link href="/transaction" aria-current={!type ? "page" : undefined} className="inline-flex min-h-8 items-center rounded-full border px-3 text-xs">All ({allTotal})</Link>
            {TRANSACTION_TYPES.map((item) => <Link key={item} href={query({ type: item === type ? undefined : item, page: undefined })} aria-current={item === type ? "page" : undefined} className="inline-flex min-h-8 items-center rounded-full border px-3 text-xs">{humanize(item)} ({typeCounts.find((row) => row.type === item)?._count._all ?? 0})</Link>)}
          </nav></div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">No transactions yet.</p>
          ) : (
            <>
            <ul className="divide-y divide-line sm:hidden">{transactions.map((t) => <li key={t.id} className="space-y-1 p-4 text-sm"><div className="flex justify-between gap-2"><Badge tone={t.type === "REFUND" ? "red" : "brand"}>{humanize(t.type)}</Badge><strong>{formatCurrency(t.amount, t.currency)}</strong></div><p>{t.relatedStudent ? fullName(t.relatedStudent) : t.relatedAgency?.companyName ?? "General transaction"}</p><p className="text-xs text-ink-muted">{formatDate(t.date)} · {humanize(t.method ?? "Unknown method")}</p>{t.notes && <p className="break-words text-xs text-ink-muted">{t.notes}</p>}{user.role === "SUPER_ADMIN" && <DeleteButton endpoint={`/api/transactions/${t.id}`} confirmText="Delete this transaction?" />}</li>)}</ul>
            <div className="hidden overflow-x-auto sm:block" tabIndex={0} role="region" aria-label="Transaction ledger">
              <table className="w-full text-sm"><caption className="sr-only">Transactions recorded by staff</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                    <th scope="col" className="p-4">Date</th>
                    <th scope="col" className="p-4">Type</th>
                    <th scope="col" className="p-4">Amount</th>
                    <th scope="col" className="p-4">Method</th>
                    <th scope="col" className="p-4">Student</th>
                    <th scope="col" className="p-4">Agency</th>
                    <th scope="col" className="p-4">Notes</th>
                    <th scope="col" className="p-4">Entered by</th>
                    {user.role === "SUPER_ADMIN" && <th scope="col" className="p-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-navy-700">
                  {transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="p-4 text-ink-muted">{formatDate(t.date)}</td>
                      <td className="p-4"><Badge tone={t.type === "REFUND" ? "red" : t.type === "COMMISSION_PAYOUT" ? "green" : "brand"}>{humanize(t.type)}</Badge></td>
                      <td className="p-4 font-medium">{formatCurrency(t.amount, t.currency)}</td>
                      <td className="p-4 text-ink-muted">{humanize(t.method ?? "Unknown method")}</td>
                      <td className="p-4">{t.relatedStudent ? fullName(t.relatedStudent) : "—"}</td>
                      <td className="p-4">{t.relatedAgency ? (t.relatedAgency.companyName ?? fullName(t.relatedAgency)) : "—"}</td>
                      <td className="p-4 text-ink-muted">{t.notes ?? "—"}</td>
                      <td className="p-4 text-ink-muted">{t.enteredBy.firstName} {t.enteredBy.lastName}</td>
                      {user.role === "SUPER_ADMIN" && <td className="p-4 text-right"><DeleteButton endpoint={`/api/transactions/${t.id}`} confirmText="Delete this transaction?" /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
      {total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-ink-muted">Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} of {total} transactions.</p>{pageCount > 1 && <nav aria-label="Transaction pages" className="flex items-center gap-2">{currentPage > 1 ? <Link className="inline-flex min-h-9 items-center rounded-lg border px-3" href={query({ page: currentPage - 1 })}>Previous</Link> : <span aria-disabled="true">Previous</span>}<span>Page {currentPage} of {pageCount}</span>{currentPage < pageCount ? <Link className="inline-flex min-h-9 items-center rounded-lg border px-3" href={query({ page: currentPage + 1 })}>Next</Link> : <span aria-disabled="true">Next</span>}</nav>}</div>}
    </div>
  );
}
