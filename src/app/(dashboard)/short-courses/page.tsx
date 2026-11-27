import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listShortCourses } from "@/lib/queries";
import { studentScopeWhere } from "@/lib/permissions";
import { Pagination } from "@/components/pagination";
import { EnrollButton } from "@/components/enroll-button";
import { DeleteButton } from "@/components/delete-button";
import { FeeDisplay } from "@/components/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SHORT_COURSE_CATEGORIES } from "@/lib/constants";
import { formatDate, humanize } from "@/lib/utils";

export const metadata = { title: "Short courses" };

type SearchParams = Promise<{ category?: string; q?: string; delivery?: string; payment?: string; status?: string; page?: string; perPage?: string }>;
const PAGE_SIZES = [6, 12, 24, 48] as const;
function isValidStatus(value: string): value is "draft" | "active" {
  return value === "draft" || value === "active";
}

export default async function ShortCoursesPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");

  const { category: categoryParam, q: rawQ = "", delivery = "", payment = "", status: rawStatus = "", page: rawPage = "1", perPage: rawPerPage = "6" } = await searchParams;
  const category = SHORT_COURSE_CATEGORIES.includes(categoryParam ?? "") ? categoryParam : undefined;
  const q = rawQ.trim().slice(0, 120);
  const deliveryMode = ["online", "in-person", "hybrid"].includes(delivery) ? delivery : undefined;
  const paymentType = ["FREE", "PAID", "OTHER"].includes(payment) ? payment as "FREE" | "PAID" | "OTHER" : undefined;
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const selectedStatus = isValidStatus(rawStatus) ? rawStatus : undefined;
  const isStaff = user.role !== "STUDENT";
  const pageSize = PAGE_SIZES.includes(Number(rawPerPage) as (typeof PAGE_SIZES)[number]) ? Number(rawPerPage) : 6;
  const requestedPage = Math.max(1, Number.parseInt(rawPage, 10) || 1);

  const [{ courses, total }, categoryRows, activeCourseCount, draftCourseCount] = await Promise.all([
    listShortCourses({ category, q, deliveryMode, paymentType, status: isSuperAdmin ? selectedStatus : undefined, includeInactive: isSuperAdmin, take: pageSize, skip: (requestedPage - 1) * pageSize }),
    prisma.shortCourse.groupBy({
      by: ["category"],
      where: isSuperAdmin ? {} : { status: "active" },
      _count: { _all: true },
    }),
    prisma.shortCourse.count({ where: { status: "active" } }),
    prisma.shortCourse.count({ where: { status: "draft" } }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, requestedPage);
  const pagedCourses = page === requestedPage ? courses : (await listShortCourses({ category, q, deliveryMode, paymentType, status: isSuperAdmin ? selectedStatus : undefined, includeInactive: isSuperAdmin, take: pageSize, skip: (page - 1) * pageSize })).courses;

  const myEnrollments =
    user.role === "STUDENT"
      ? await prisma.shortCourseEnrollment.findMany({
          where: { studentId: user.id },
          select: { shortCourseId: true, status: true },
        })
      : [];

  // Receipt actions live on a separate review page so the course catalog stays focused.
  const reviewWhere = { status: "pending_approval" as const, student: studentScopeWhere(user) };
  const pendingReceiptCount = isStaff ? await prisma.shortCourseEnrollment.count({ where: reviewWhere }) : 0;

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
      <header className="relative isolate flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl bg-gradient-to-br from-[#10254f] via-[#263c83] to-[#6546b8] p-6 text-white shadow-lg sm:p-8 lg:p-10">
        <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Learning that fits your next step</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Short courses</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 sm:text-base sm:leading-7">
            Explore focused learning, compare course formats and fees, then manage enrollment from one clear workspace.
          </p>
        </div>
        {isSuperAdmin && <Link href="/short-courses/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-indigo-900 shadow-md transition hover:-translate-y-0.5 hover:bg-blue-50">+ Create course</Link>}
      </header>

      {isSuperAdmin && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-muted">Active courses</p>
              <p className="mt-1 text-2xl font-bold">{activeCourseCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-ink-muted">Draft courses</p>
              <p className="mt-1 text-2xl font-bold">{draftCourseCount}</p>
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
              <Link href="/short-courses/reviews" className="mt-1 inline-flex min-h-7 items-center gap-1 text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300">Open review inbox ({pendingReceiptCount})</Link>
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

      <form action="/short-courses" method="get" role="search" aria-label="Filter short courses" className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6 dark:border-navy-700 dark:bg-navy-900">
        <label className="text-sm font-medium sm:col-span-2">Search courses<input name="q" type="search" maxLength={120} defaultValue={q} placeholder="Course, provider or topic" className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 dark:border-navy-700 dark:bg-navy-900" /></label>
        <label className="text-sm font-medium">Category<select name="category" defaultValue={category ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 dark:border-navy-700 dark:bg-navy-900"><option value="">All categories</option>{SHORT_COURSE_CATEGORIES.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
        <label className="text-sm font-medium">Delivery<select name="delivery" defaultValue={deliveryMode ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 dark:border-navy-700 dark:bg-navy-900"><option value="">Any format</option><option value="online">Online</option><option value="in-person">In person</option><option value="hybrid">Hybrid</option></select></label>
        <label className="text-sm font-medium">Payment<select name="payment" defaultValue={paymentType ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 dark:border-navy-700 dark:bg-navy-900"><option value="">Any fee</option><option value="FREE">Free</option><option value="PAID">Paid</option><option value="OTHER">Other</option></select></label>
        {isSuperAdmin && <label className="text-sm font-medium">Visibility<select name="status" defaultValue={selectedStatus ?? ""} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 dark:border-navy-700 dark:bg-navy-900"><option value="">All statuses</option><option value="active">Published</option><option value="draft">Draft</option></select></label>}
        <label className="text-sm font-medium">Per page<select name="perPage" defaultValue={String(pageSize)} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 dark:border-navy-700 dark:bg-navy-900">{PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <div className="flex items-end gap-2"><button className="min-h-11 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">Apply filters</button><Link href="/short-courses" className="inline-flex min-h-11 items-center rounded-lg border border-line-strong px-3 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700">Reset</Link></div>
      </form>
      <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} basePath="/short-courses" query={{ q, category, delivery: deliveryMode, payment: paymentType, status: isSuperAdmin ? selectedStatus : undefined, perPage: String(pageSize) }} label="Short course pages" />

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
            {pagedCourses.map((c) => {
              const status = enrolledMap.get(c.id);
              const hasAccess = status === "enrolled" || status === "completed";
              return (
                <Card key={c.id} data-short-course-id={c.id} className="group overflow-hidden border-line/80 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg dark:border-navy-700">
                  <div aria-hidden="true" className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />
                  <CardContent className="flex h-full flex-col p-5 sm:p-6">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">{c.provider}</p>
                        <h2 className="mt-1 text-lg font-bold leading-snug tracking-tight"><Link href={`/short-courses/${c.id}`} className="transition group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{c.title}</Link></h2>
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-1">
                        {isSuperAdmin && <Badge tone={c.status === "active" ? "green" : "slate"}>{humanize(c.status)}</Badge>}
                        <Badge tone="brand">{humanize(c.category)}</Badge>
                      </div>
                    </div>
                    <p className="mb-4 line-clamp-2 min-h-10 text-sm leading-5 text-ink-muted">{c.description || "Course details and enrollment information."}</p>
                    <dl className="mb-5 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-canvas-subtle p-3 dark:bg-navy-800"><dt className="text-xs text-ink-muted">Duration</dt><dd className="mt-1 font-semibold">{c.duration}</dd></div>
                      <div className="rounded-xl bg-canvas-subtle p-3 dark:bg-navy-800"><dt className="text-xs text-ink-muted">Delivery</dt><dd className="mt-1 font-semibold capitalize">{c.deliveryMode}</dd></div>
                      <div className="rounded-xl bg-canvas-subtle p-3 dark:bg-navy-800"><dt className="text-xs text-ink-muted">Next start</dt><dd className="mt-1 font-semibold">
                          {(() => {
                            const nextStart = c.startDates
                              .map((d) => new Date(d))
                              .filter((d) => d.getTime() > Date.now())
                              .sort((a, b) => a.getTime() - b.getTime())[0];
                            return nextStart ? formatDate(nextStart) : "—";
                          })()}
                        </dd></div>
                      <div className="rounded-xl bg-canvas-subtle p-3 dark:bg-navy-800"><dt className="text-xs text-ink-muted">Fee</dt><dd className="mt-1 font-bold"><FeeDisplay amount={c.fee} /></dd></div>
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
                      {user.role === "STUDENT" && (status === "enrolled" || status === "completed") && <Link href={`/short-courses/${c.id}/classroom`} className="inline-flex h-8 items-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 text-xs font-bold text-white hover:brightness-110">Enter classroom</Link>}
                      {isSuperAdmin && (
                        <>
                          <Link href={`/short-courses/${c.id}/classroom`} className="inline-flex h-8 items-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 text-xs font-bold text-white hover:brightness-110">Classroom</Link>
                          <Link href={`/short-courses/${c.id}/edit`} className="inline-flex h-8 items-center rounded-lg border border-line-strong px-3 text-xs font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:hover:bg-navy-800">Edit</Link>
                          <DeleteButton endpoint={`/api/short-courses/${c.id}`} confirmText="Delete this short course?" label="Delete" />
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} basePath="/short-courses" query={{ q, category, delivery: deliveryMode, payment: paymentType, status: isSuperAdmin ? selectedStatus : undefined, perPage: String(pageSize) }} label="Short course pages (continued)" />
        </>
      )}

    </div>
  );
}
