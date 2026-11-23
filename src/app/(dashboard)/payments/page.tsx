import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRANSACTION_TYPES } from "@/lib/constants";
import { formatDate, formatCurrency, fullName, humanize, toNum } from "@/lib/utils";
import type { TransactionType } from "@/generated/prisma/client";
import { ReceiptReview } from "@/components/receipt-review";

export const metadata = { title: "Payments" };

/** Money coming back to the student, used to sign the amount and the totals. */
const OUTGOING_TYPES: TransactionType[] = ["REFUND"];

function typeTone(type: TransactionType): "green" | "brand" | "amber" | "slate" {
  if (type === "REFUND") return "amber";
  if (type === "COMMISSION_PAYOUT") return "green";
  if (type === "DEPOSIT") return "brand";
  return "slate";
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  card: "Card",
  online: "Online payment",
};

function methodLabel(method: string | null): string {
  return method ? METHOD_LABELS[method] ?? humanize(method) : "—";
}

type MoneyRow = { currency: string; amount: number };

function sumByCurrency(rows: { currency: string; type: TransactionType; amount: unknown }[]): MoneyRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const signed = OUTGOING_TYPES.includes(row.type) ? -toNum(row.amount) : toNum(row.amount);
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + signed);
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

/** Refund totals are shown as a magnitude; the "Refunded" label already supplies the direction. */
function sumMagnitudes(rows: { currency: string; amount: unknown }[]): MoneyRow[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    totals.set(row.currency, (totals.get(row.currency) ?? 0) + toNum(row.amount));
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

function moneySummary(rows: MoneyRow[]): string {
  return rows.map((row) => formatCurrency(row.amount, row.currency)).join(" · ") || "—";
}

/** A scrollable table region must be reachable by keyboard (WCAG 2.1.1). */
const scrollRegionProps = {
  role: "region" as const,
  tabIndex: 0,
  "aria-label": "Payments table, scrollable",
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/");

  const { type: typeParam } = await searchParams;

  if (user.role === "STUDENT") {
    const paymentSetting = await prisma.portalSetting.findUnique({ where: { key: "paymentDetails" }, select: { value: true } });
    let bank: { bankName?: string; accountName?: string; accountNumber?: string; iban?: string; bankInstructions?: string } = {};
    if (paymentSetting) { try { bank = JSON.parse(paymentSetting.value); } catch { bank = {}; } }
    const [transactions, courseReceipts] = await Promise.all([prisma.transaction.findMany({
      where: { relatedStudentId: user.id },
      orderBy: { date: "desc" },
      include: {
        relatedApplication: { include: { program: { include: { university: true } } } },
      },
    }), prisma.shortCourseEnrollment.findMany({ where: { studentId: user.id, receiptUrl: { not: null } }, orderBy: { enrolledAt: "desc" }, include: { shortCourse: { select: { id: true, title: true } } } })]);
    const payments = transactions.filter((t) => !OUTGOING_TYPES.includes(t.type));
    const refunds = transactions.filter((t) => OUTGOING_TYPES.includes(t.type));
    const paid = moneySummary(sumByCurrency(payments));
    const refunded = moneySummary(sumMagnitudes(refunds));

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-sm text-ink-muted">
            Everything staff have recorded against your student account.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-muted">Total paid</p>
              <p className="mt-1 text-xl font-bold">{paid}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-muted">Payments recorded</p>
              <p className="mt-1 text-xl font-bold">{payments.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-muted">Refunded</p>
              <p className="mt-1 text-xl font-bold">{refunded}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-medium">No payments recorded yet.</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
                  Staff add a payment here once they receive it. Course receipts are uploaded from{" "}
                  <Link href="/short-courses" className="inline-flex min-h-6 items-center font-medium underline">
                    your short courses
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <>
                {/* Small screens: one card per payment instead of a sideways-scrolling table. */}
                <ul className="space-y-3 sm:hidden">
                  {transactions.map((t) => {
                    const out = OUTGOING_TYPES.includes(t.type);
                    return (
                      <li key={t.id} className="rounded-xl border border-line p-4 dark:border-navy-700">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone={typeTone(t.type)}>{humanize(t.type)}</Badge>
                          <span className={out ? "font-medium text-amber-700 dark:text-amber-300" : "font-medium"}>
                            {out ? "−" : ""}
                            {formatCurrency(t.amount, t.currency)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-medium">{t.notes || humanize(t.type)}</p>
                        <p className="text-xs text-ink-muted">
                          {t.relatedApplication
                            ? `${t.relatedApplication.program.university.name} — ${t.relatedApplication.program.name}`
                            : "General payment · not linked to an application"}
                        </p>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                          <span>{formatDate(t.date)}</span>
                          <span aria-hidden="true">·</span>
                          <span>{methodLabel(t.method)}</span>
                        </p>
                      </li>
                    );
                  })}
                </ul>

                <div className="hidden overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:block" {...scrollRegionProps}>
                  <table className="w-full text-sm">
                    <caption className="sr-only">Your payment history, most recent first</caption>
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                        <th scope="col" className="p-4">Date</th>
                        <th scope="col" className="p-4">Type</th>
                        <th scope="col" className="p-4">Details</th>
                        <th scope="col" className="p-4">Method</th>
                        <th scope="col" className="p-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line dark:divide-navy-700">
                      {transactions.map((t) => {
                        const out = OUTGOING_TYPES.includes(t.type);
                        return (
                          <tr key={t.id}>
                            <td className="p-4 text-ink-muted">{formatDate(t.date)}</td>
                            <td className="p-4"><Badge tone={typeTone(t.type)}>{humanize(t.type)}</Badge></td>
                            <td className="p-4">
                              <p className="font-medium">{t.notes || humanize(t.type)}</p>
                              <p className="text-xs text-ink-muted">
                                {t.relatedApplication
                                  ? `${t.relatedApplication.program.university.name} — ${t.relatedApplication.program.name}`
                                  : "General payment · not linked to an application"}
                              </p>
                            </td>
                            <td className="p-4 text-ink-muted">{methodLabel(t.method)}</td>
                            <td className={out ? "p-4 text-right font-medium text-amber-700 dark:text-amber-300" : "p-4 text-right font-medium"}>
                              {out ? "−" : ""}
                              {formatCurrency(t.amount, t.currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-ink-muted">
                  Payments are recorded by staff after you pay the university or agency directly — this portal does not
                  take card payments. Invoice balances and refunds are confirmed by your counselor.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card><CardHeader><CardTitle>Short course receipts</CardTitle></CardHeader><CardContent>{courseReceipts.length ? <ul className="divide-y divide-line dark:divide-navy-700">{courseReceipts.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{entry.shortCourse.title}</p><p className="text-xs text-ink-muted">Receipt status: {humanize(entry.status)}</p></div><a href={`/api/short-courses/${entry.shortCourse.id}/receipt`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-line-strong px-3 text-sm font-medium text-brand-700 hover:bg-canvas">View receipt</a></li>)}</ul> : <p className="text-sm text-ink-muted">Short course receipts you upload will appear here for tracking.</p>}</CardContent></Card>
        {(bank.bankName || bank.accountNumber) && <Card><CardHeader><CardTitle>Bank transfer details</CardTitle></CardHeader><CardContent className="grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-ink-muted">Bank:</span> {bank.bankName || "—"}</p><p><span className="text-ink-muted">Account name:</span> {bank.accountName || "—"}</p><p><span className="text-ink-muted">Account number:</span> <span className="font-mono">{bank.accountNumber || "—"}</span></p><p><span className="text-ink-muted">IBAN / routing:</span> <span className="font-mono">{bank.iban || "—"}</span></p>{bank.bankInstructions && <p className="sm:col-span-2">{bank.bankInstructions}</p>}</CardContent></Card>}
      </div>
    );
  }

  // Partner view — payments scoped to the actor's hierarchy.
  const studentScope = studentScopeWhere(user);
  const scopeWhere =
    user.role === "AGENCY"
      ? { OR: [{ relatedStudent: studentScope }, { relatedAgencyId: user.id }] }
      : user.role === "SUPER_ADMIN" || user.role === "MANAGER"
        ? {}
        : { relatedStudent: studentScope };

  const typeFilter = TRANSACTION_TYPES.includes(typeParam ?? "") ? (typeParam as TransactionType) : undefined;
  const where = {
    ...scopeWhere,
    ...(typeFilter ? { type: typeFilter } : {}),
  };

  const [rows, total, typeCounts, currencySums] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: 101,
      include: {
        relatedStudent: { select: { id: true, firstName: true, lastName: true } },
        relatedApplication: { include: { program: { select: { name: true } } } },
      },
    }),
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: scopeWhere,
      _count: { _all: true },
    }),
    prisma.transaction.groupBy({
      by: ["currency", "type"],
      where,
      _sum: { amount: true },
    }),
  ]);
  const courseReceipts = await prisma.shortCourseEnrollment.findMany({
    where: { student: studentScope, receiptUrl: { not: null } },
    orderBy: { enrolledAt: "desc" },
    take: 50,
    include: { student: { select: { id: true, firstName: true, lastName: true } }, shortCourse: { select: { id: true, title: true } } },
  });

  const shown = rows.slice(0, 100);
  const countMap = new Map(typeCounts.map((row) => [row.type, row._count._all]));
  const totalCount = typeCounts.reduce((n, row) => n + row._count._all, 0);
  const totals = sumByCurrency(
    currencySums.map((row) => ({ currency: row.currency, type: row.type, amount: row._sum.amount })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-ink-muted">Recorded payments across your students.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-ink-muted">Net recorded{typeFilter ? ` · ${humanize(typeFilter)}` : ""}</p>
            <p className="mt-1 text-xl font-bold">{moneySummary(totals)}</p>
            <p className="mt-1 text-xs text-ink-muted">Refunds are subtracted from the totals.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-ink-muted">Records{typeFilter ? ` of this type` : ""}</p>
            <p className="mt-1 text-xl font-bold">{total}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {total > 100 ? `The table shows the 100 most recent of ${total}.` : "All records are shown."}
            </p>
          </CardContent>
        </Card>
      </div>

      <nav aria-label="Filter payments by type" className="flex flex-wrap gap-2">
        <Link
          href="/payments"
          aria-current={!typeFilter ? "page" : undefined}
          className={
            "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium " +
            (!typeFilter
              ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
              : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:text-slate-300")
          }
        >
          All ({totalCount})
        </Link>
        {TRANSACTION_TYPES.map((type) => {
          const count = countMap.get(type as TransactionType) ?? 0;
          const active = typeFilter === type;
          return (
            <Link
              key={type}
              href={`/payments?type=${type}`}
              aria-current={active ? "page" : undefined}
              className={
                "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium " +
                (active
                  ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                  : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:text-slate-300")
              }
            >
              {humanize(type)} ({count})
            </Link>
          );
        })}
      </nav>

      <Card>
        <CardHeader>
          <CardTitle>{typeFilter ? `${humanize(typeFilter)} payments` : "Recent payments"}</CardTitle>
        </CardHeader>
        <CardContent>
          {shown.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-medium">
                {typeFilter ? `No ${humanize(typeFilter).toLowerCase()} payments recorded.` : "No payments yet."}
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                {typeFilter ? "Clear the filter to see every payment." : "Staff-entered payments will appear here."}
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-3 sm:hidden">
                {shown.map((t) => (
                  <li key={t.id} className="rounded-xl border border-line p-4 dark:border-navy-700">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{t.relatedStudent ? fullName(t.relatedStudent) : "—"}</span>
                      <Badge tone={typeTone(t.type)}>{humanize(t.type)}</Badge>
                    </div>
                    <p className="mt-2 text-sm">{t.notes || humanize(t.type)}</p>
                    {t.relatedApplication && (
                      <p className="text-xs text-ink-muted">{t.relatedApplication.program.name}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-muted">
                      <span>{formatDate(t.date)} · {methodLabel(t.method)}</span>
                      <span className="font-medium text-ink">
                        {OUTGOING_TYPES.includes(t.type) ? "−" : ""}
                        {formatCurrency(t.amount, t.currency)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 sm:block" {...scrollRegionProps}>
                <table className="w-full text-sm">
                  <caption className="sr-only">Recorded payments, most recent first</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                      <th scope="col" className="p-4">Student</th>
                      <th scope="col" className="p-4">Type</th>
                      <th scope="col" className="p-4">Details</th>
                      <th scope="col" className="p-4">Method</th>
                      <th scope="col" className="p-4 text-right">Amount</th>
                      <th scope="col" className="p-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line dark:divide-navy-700">
                    {shown.map((t) => (
                      <tr key={t.id}>
                        <td className="p-4 font-medium">{t.relatedStudent ? fullName(t.relatedStudent) : "—"}</td>
                        <td className="p-4"><Badge tone={typeTone(t.type)}>{humanize(t.type)}</Badge></td>
                        <td className="p-4">
                          <p>{t.notes || humanize(t.type)}</p>
                          {t.relatedApplication && (
                            <p className="text-xs text-ink-muted">{t.relatedApplication.program.name}</p>
                          )}
                        </td>
                        <td className="p-4 text-ink-muted">{methodLabel(t.method)}</td>
                        <td className="p-4 text-right font-medium">
                          {OUTGOING_TYPES.includes(t.type) ? "−" : ""}
                          {formatCurrency(t.amount, t.currency)}
                        </td>
                        <td className="p-4 text-ink-muted">{formatDate(t.date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total > 100 && (
                <p className="mt-4 text-xs text-ink-muted">
                  Showing the 100 most recent of {total} payments. Filter by type to narrow the list.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Short course receipts</CardTitle></CardHeader><CardContent>{courseReceipts.length ? <ul className="divide-y divide-line dark:divide-navy-700">{courseReceipts.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{entry.shortCourse.title}</p><p className="text-xs text-ink-muted">{fullName(entry.student)} · {humanize(entry.status)}</p></div><div className="flex flex-wrap items-center gap-2"><a href={`/api/short-courses/${entry.shortCourse.id}/receipt`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center rounded-lg border border-line-strong px-3 text-sm font-medium text-brand-700 hover:bg-canvas">View receipt</a>{entry.status === "pending_approval" && <ReceiptReview enrollmentId={entry.id} studentName={fullName(entry.student)} />}</div></li>)}</ul> : <p className="text-sm text-ink-muted">No short course receipts have been submitted in your student scope.</p>}</CardContent></Card>
    </div>
  );
}
