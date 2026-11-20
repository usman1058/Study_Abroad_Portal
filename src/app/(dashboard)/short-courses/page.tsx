import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listShortCourses } from "@/lib/queries";
import { studentScopeWhere } from "@/lib/permissions";
import { ShortCourseForm } from "@/components/short-course-form";
import { EnrollButton } from "@/components/enroll-button";
import { DeleteButton } from "@/components/delete-button";
import { ReceiptReview } from "@/components/receipt-review";
import { FeeDisplay } from "@/components/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SHORT_COURSE_CATEGORIES } from "@/lib/constants";
import { formatDate, fullName, humanize } from "@/lib/utils";

export const metadata = { title: "Short courses" };

type SearchParams = Promise<{ category?: string }>;

export default async function ShortCoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");

  const { category: categoryParam } = await searchParams;
  const category = SHORT_COURSE_CATEGORIES.includes(categoryParam ?? "") ? categoryParam : undefined;

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isStaff = user.role !== "STUDENT";

  const [{ courses, total, truncated }, categoryRows] = await Promise.all([
    listShortCourses({ category }),
    prisma.shortCourse.groupBy({
      by: ["category"],
      where: { status: "active" },
      _count: { _all: true },
    }),
  ]);

  const myEnrollments =
    user.role === "STUDENT"
      ? await prisma.shortCourseEnrollment.findMany({
          where: { studentId: user.id },
          select: { shortCourseId: true, status: true },
        })
      : [];

  // Oldest first so nothing waits forever; the 50-row bound is stated, never silent.
  const reviewWhere = { status: "pending_approval" as const, student: studentScopeWhere(user) };
  const [pendingRows, pendingTotal] = isStaff
    ? await Promise.all([
        prisma.shortCourseEnrollment.findMany({
          where: reviewWhere,
          include: {
            student: { select: { id: true, firstName: true, lastName: true } },
            shortCourse: { select: { id: true, title: true } },
          },
          orderBy: { enrolledAt: "asc" },
          take: 51,
        }),
        prisma.shortCourseEnrollment.count({ where: reviewWhere }),
      ])
    : [[], 0];
  const pendingReviews = pendingRows.slice(0, 50);

  const courseStats = isSuperAdmin
    ? await prisma.shortCourseEnrollment.groupBy({ by: ["status"], _count: { _all: true } })
    : [];
  const enrolledCount = courseStats
    .filter((s) => s.status === "enrolled" || s.status === "completed")
    .reduce((n, s) => n + s._count._all, 0);
  const pendingCount = courseStats
    .filter((s) => s.status === "pending_approval" || s.status === "pending_payment")
    .reduce((n, s) => n + s._count._all, 0);

  const enrolledMap = new Map(myEnrollments.map((e) => [e.shortCourseId, e.status]));
  const categoryCount = new Map<string, number>(categoryRows.map((row) => [row.category, row._count._all]));
  const totalCourses = categoryRows.reduce((n, row) => n + row._count._all, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Short courses</h1>
          <p className="text-sm text-ink-muted">
            Language, test-prep, foundation and professional courses.
          </p>
        </div>
        {isSuperAdmin && <ShortCourseForm />}
      </div>

      {isSuperAdmin && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-muted">Active courses</p>
              <p className="mt-1 text-2xl font-bold">{totalCourses}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-muted">Enrolled students</p>
              <p className="mt-1 text-2xl font-bold">{enrolledCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-muted">Pending applications/payments</p>
              <p className="mt-1 text-2xl font-bold">{pendingCount}</p>
              <Link
                href="#receipts"
                className="mt-1 inline-flex min-h-6 items-center text-xs font-medium text-brand-700 underline dark:text-brand-300"
              >
                Review receipts
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {totalCourses > 0 && (
        <nav aria-label="Filter short courses by category" className="flex flex-wrap gap-2">
          <Link
            href="/short-courses"
            aria-current={!category ? "page" : undefined}
            className={
              "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium " +
              (!category
                ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:text-slate-300")
            }
          >
            All ({totalCourses})
          </Link>
          {SHORT_COURSE_CATEGORIES.map((value) => {
            const count = categoryCount.get(value) ?? 0;
            if (count === 0) return null;
            const active = category === value;
            return (
              <Link
                key={value}
                href={`/short-courses?category=${value}`}
                aria-current={active ? "page" : undefined}
                className={
                  "inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-medium " +
                  (active
                    ? "border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                    : "border-line-strong text-ink-muted hover:bg-canvas dark:border-navy-700 dark:text-slate-300")
                }
              >
                {humanize(value)} ({count})
              </Link>
            );
          })}
        </nav>
      )}

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">
              {category ? `No ${humanize(category).toLowerCase()} courses right now.` : "No short courses are open right now."}
            </p>
            {category ? (
              <Link href="/short-courses" className="mt-3 inline-flex min-h-8 items-center text-sm font-medium text-brand-700 underline dark:text-brand-300">
                Show all courses
              </Link>
            ) : (
              <p className="mt-1 text-sm text-ink-muted">
                {isSuperAdmin
                  ? "Use “+ Add short course” above to create the first one."
                  : "Check back soon, or ask your counselor which courses are running."}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => {
              const status = enrolledMap.get(c.id);
              const hasAccess = status === "enrolled" || status === "completed";
              return (
                <Card key={c.id} data-short-course-id={c.id}>
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-ink-muted">{c.provider}</p>
                        <h2 className="text-base font-semibold">{c.title}</h2>
                      </div>
                      <Badge tone="brand">{humanize(c.category)}</Badge>
                    </div>
                    <p className="mb-3 line-clamp-2 text-sm text-ink-muted">{c.description || "No description."}</p>
                    <dl className="mb-4 space-y-1 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-muted">Duration</dt>
                        <dd>{c.duration}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-muted">Delivery</dt>
                        <dd className="capitalize">{c.deliveryMode}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-muted">Next start</dt>
                        <dd>
                          {(() => {
                            const nextStart = c.startDates
                              .map((d) => new Date(d))
                              .filter((d) => d.getTime() > Date.now())
                              .sort((a, b) => a.getTime() - b.getTime())[0];
                            return nextStart ? formatDate(nextStart) : "—";
                          })()}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-muted">Fee</dt>
                        <dd className="font-medium">
                          <FeeDisplay amount={c.fee} />
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-auto flex flex-wrap items-start gap-2">
                      <Link
                        href={`/short-courses/${c.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-line-strong px-3 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:border-navy-700 dark:text-brand-300 dark:hover:bg-brand-900/30"
                      >
                        More details
                      </Link>
                      {user.role === "STUDENT" && (
                        <EnrollButton
                          shortCourseId={c.id}
                          enrolled={hasAccess}
                          status={status}
                          paymentType={c.paymentType as "FREE" | "PAID" | "OTHER"}
                          course={{
                            fee: c.fee,
                            deliveryMode: c.deliveryMode,
                            classSchedule: c.classSchedule,
                            meetingLink: hasAccess ? c.meetingLink : null,
                            startDates: c.startDates,
                            duration: c.duration,
                          }}
                        />
                      )}
                      {isSuperAdmin && (
                        <>
                          <ShortCourseForm
                            initial={{
                              id: c.id,
                              title: c.title,
                              provider: c.provider,
                              category: c.category,
                              duration: c.duration,
                              startDates: c.startDates,
                              fee: String(c.fee),
                              deliveryMode: c.deliveryMode,
                              classSchedule: c.classSchedule,
                              meetingLink: c.meetingLink,
                              prerequisites: c.prerequisites,
                              description: c.description,
                              linkedProgramId: c.linkedProgram?.id,
                              linkedProgramLabel: c.linkedProgram
                                ? `${c.linkedProgram.university?.name ?? ""} — ${c.linkedProgram.name}`
                                : undefined,
                              paymentType: c.paymentType as "FREE" | "PAID" | "OTHER",
                              bankDetails: c.bankDetails ?? "",
                            }}
                          />
                          <DeleteButton endpoint={`/api/short-courses/${c.id}`} confirmText="Delete this short course?" label="Delete" />
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {truncated && (
            <p className="text-xs text-ink-muted">
              Showing the first {courses.length} of {total} short courses. Use the category filter to narrow the list.
            </p>
          )}
        </>
      )}

      {isStaff && (
        <Card id="receipts">
          <CardHeader>
            <CardTitle>Receipts awaiting review</CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReviews.length === 0 ? (
              <p className="py-6 text-center text-sm text-ink-muted">No receipts are waiting for review.</p>
            ) : (
              <div
                role="region"
                tabIndex={0}
                aria-label="Receipts awaiting review, scrollable"
                className="overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <table className="w-full text-sm">
                  <caption className="sr-only">Paid-course receipts waiting for a decision</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                      <th scope="col" className="p-4">Student</th>
                      <th scope="col" className="p-4">Course</th>
                      <th scope="col" className="p-4">Enrolled</th>
                      <th scope="col" className="p-4">Receipt</th>
                      <th scope="col" className="p-4 text-right">Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line dark:divide-navy-700">
                    {pendingReviews.map((review) => {
                      const name = fullName(review.student);
                      return (
                        <tr key={review.id}>
                          <td className="p-4 font-medium">{name}</td>
                          <td className="p-4">
                            <Link href={`/short-courses/${review.shortCourse.id}`} className="hover:underline">
                              {review.shortCourse.title}
                            </Link>
                          </td>
                          <td className="p-4 text-ink-muted">{formatDate(review.enrolledAt)}</td>
                          <td className="p-4">
                            <a
                              href={`/api/short-courses/${review.shortCourse.id}/receipt?studentId=${review.student.id}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`Open ${name}'s receipt`}
                              className="inline-flex min-h-8 items-center font-medium text-brand-700 underline dark:text-brand-300"
                            >
                              Open receipt
                            </a>
                          </td>
                          <td className="p-4">
                            <ReceiptReview enrollmentId={review.id} studentName={name} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {pendingReviews.length > 0 && pendingTotal > 50 && (
              <p className="mt-4 text-xs text-ink-muted">
                Showing the 50 oldest of {pendingTotal} receipts. Approve or reject these to reveal the rest.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
