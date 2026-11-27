import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { ReceiptReview } from "@/components/receipt-review";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseSectionHeader } from "@/components/short-course-workspace-nav";
import { formatDate, fullName } from "@/lib/utils";
import { FileCheck2 } from "lucide-react";

export const metadata = { title: "Short-course receipt review" };

export default async function ShortCourseReceiptReviewsPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role === "STUDENT") redirect("/short-courses");
  const where = { status: "pending_approval" as const, student: studentScopeWhere(user) };
  const [reviews, total] = await Promise.all([
    prisma.shortCourseEnrollment.findMany({
      where,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true } },
        shortCourse: { select: { id: true, title: true, provider: true } },
      },
      orderBy: { enrolledAt: "asc" },
      take: 51,
    }),
    prisma.shortCourseEnrollment.count({ where }),
  ]);
  const rows = reviews.slice(0, 50);
  return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
    <CourseSectionHeader eyebrow="Short courses · Admin workspace" title="Receipt review inbox" description="Check submitted payment receipts and confirm classroom access. Reviews are limited to students in your assigned scope." />
    <div><Link href="/short-courses" className="inline-flex min-h-9 items-center text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">← Back to course catalog</Link></div>
    <Card className="border-line/80 shadow-sm dark:border-navy-700"><CardHeader><CardTitle>{total} {total === 1 ? "receipt" : "receipts"} awaiting review</CardTitle><p className="text-sm text-ink-muted">Approve a valid receipt to unlock the classroom, or reject it so the student can upload a replacement.</p></CardHeader><CardContent>
      {rows.length ? <div className="grid gap-3">{rows.map((review) => {
        const name = fullName(review.student);
        return <article key={review.id} className="grid gap-4 rounded-2xl border border-line p-4 transition hover:border-indigo-200 hover:shadow-sm dark:border-navy-700 dark:hover:border-indigo-900 md:grid-cols-[minmax(0,1fr)_auto] md:items-center sm:p-5"><div className="min-w-0"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"><FileCheck2 className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0"><h2 className="font-bold">{name}</h2><p className="mt-0.5 break-all text-sm text-ink-muted">{review.student.email}</p></div></div><p className="mt-3 text-sm"><Link href={`/short-courses/${review.shortCourse.id}`} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">{review.shortCourse.title}</Link><span className="text-ink-muted"> · {review.shortCourse.provider}</span></p><p className="mt-1 text-xs text-ink-muted">Submitted {formatDate(review.enrolledAt)}</p></div><div className="flex flex-wrap items-center gap-2 md:justify-end"><a href={`/api/short-courses/${review.shortCourse.id}/receipt?studentId=${review.student.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line-strong px-3 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:hover:bg-navy-800">Open receipt</a><ReceiptReview enrollmentId={review.id} studentName={name} /></div></article>;
      })}</div> : <div className="rounded-2xl border border-dashed border-line-strong px-5 py-12 text-center dark:border-navy-700"><FileCheck2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" /><h2 className="mt-3 font-bold">Inbox is clear</h2><p className="mt-1 text-sm text-ink-muted">There are no short-course receipts waiting for your review.</p></div>}
      {total > 50 && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Showing the 50 oldest of {total} receipts. Review these first to reveal the next items.</p>}
    </CardContent></Card>
  </div>;
}
