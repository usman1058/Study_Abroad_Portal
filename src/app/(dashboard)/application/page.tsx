import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { ApplicationCreateForm } from "@/components/application-create-form";
import { APPLICATION_STAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StageFilter } from "@/components/stage-filter";
import { formatDate, humanize, shortRecordId } from "@/lib/utils";
import type { ApplicationStage, Prisma } from "@/generated/prisma/client";
import { CopyRecordId } from "@/components/copy-record-id";

export const metadata = { title: "Applications" };

type SearchParams = Promise<{ stage?: string; page?: string; sort?: string; q?: string }>;

const PAGE_SIZE = 25;

const STAGE_TONE: Record<string, "green" | "brand" | "amber" | "red" | "slate"> = {
  ENROLLED: "green",
  OFFER: "green",
  DEPOSIT_PAID: "green",
  VISA: "brand",
  UNDER_REVIEW: "brand",
  SUBMITTED: "brand",
  REJECTED: "red",
  WITHDRAWN: "red",
};

const SORTS = {
  updated_desc: { label: "Recently updated", orderBy: [{ updatedAt: "desc" as const }] },
  updated_asc: { label: "Oldest update first", orderBy: [{ updatedAt: "asc" as const }] },
  student_asc: { label: "Student A–Z", orderBy: [{ student: { firstName: "asc" as const } }, { student: { lastName: "asc" as const } }] },
};

function stageLabel(stage: ApplicationStage): string {
  return APPLICATION_STAGES.find((s) => s.value === stage)?.label ?? humanize(stage);
}

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const { stage = "", page = "", sort = "", q: rawQuery = "" } = await searchParams;
  const q = rawQuery.trim().slice(0, 120);
  const validStage = APPLICATION_STAGES.some((s) => s.value === stage) ? (stage as ApplicationStage) : null;
  const sortKey = (Object.keys(SORTS) as (keyof typeof SORTS)[]).find((key) => key === sort) ?? "updated_desc";

  const scope: Prisma.ApplicationWhereInput = user.role === "SUPER_ADMIN" || user.role === "MANAGER" ? {} : { student: studentScopeWhere(user) };
  const searchWhere: Prisma.ApplicationWhereInput = q
    ? {
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          { studentId: { contains: q, mode: "insensitive" } },
          { student: { is: { OR: [
            { id: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ] } } },
          { program: { is: { name: { contains: q, mode: "insensitive" } } } },
        ],
      }
    : {};
  const filteredScope: Prisma.ApplicationWhereInput = { ...scope, ...searchWhere };
  const where = { ...filteredScope, ...(validStage ? { stage: validStage } : {}) };
  const parsedPage = Number(page);
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [total, stageGroups, applicationStudents] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.groupBy({ by: ["stage"], where: filteredScope, _count: { _all: true } }),
    prisma.user.findMany({
      where: studentScopeWhere(user),
      select: { id: true, firstName: true, lastName: true, email: true, _count: { select: { applications: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);

  const counts: Record<string, number> = {};
  let allCount = 0;
  for (const group of stageGroups) {
    counts[group.stage] = group._count._all;
    allCount += group._count._all;
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // A page number past the end would render an empty table with a nonsensical
  // range, so send the reader to the last real page instead.
  if (total > 0 && requestedPage > pageCount) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (validStage) params.set("stage", validStage);
    if (sortKey !== "updated_desc") params.set("sort", sortKey);
    if (pageCount > 1) params.set("page", String(pageCount));
    const qs = params.toString();
    redirect(qs ? `/application?${qs}` : "/application");
  }
  const currentPage = requestedPage;
  const applications = await prisma.application.findMany({
    where,
    orderBy: SORTS[sortKey].orderBy,
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      program: { select: { name: true, visaRequired: true, university: { select: { name: true } } } },
    },
  });
  const firstRow = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(currentPage * PAGE_SIZE, total);
  const query = (extra: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (q && !Object.prototype.hasOwnProperty.call(extra, "q")) params.set("q", q);
    if (typeof extra.q === "string" && extra.q) params.set("q", extra.q);
    if (validStage) params.set("stage", validStage);
    if (sortKey !== "updated_desc") params.set("sort", sortKey);
    for (const [key, value] of Object.entries(extra)) {
      if (value != null && value !== "") params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `/application?${qs}` : "/application";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-ink-muted">
            {allCount} application{allCount === 1 ? "" : "s"} in your pipeline. Every row links to the student and the
            full application.
          </p>
        </div>
        <a
          href="#new-application"
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <Plus aria-hidden className="h-4 w-4" /> Add application
        </a>
      </div>

      <form action="/application" method="get" role="search" className="flex flex-wrap gap-2 rounded-xl border border-line p-3">
        {validStage && <input type="hidden" name="stage" value={validStage} />}
        {sortKey !== "updated_desc" && <input type="hidden" name="sort" value={sortKey} />}
        <label htmlFor="application-search" className="sr-only">Search by application ID, student ID, name, email or program</label>
        <input id="application-search" name="q" defaultValue={q} placeholder="Search application ID, student ID, name or program" className="min-h-10 min-w-0 flex-1 rounded-lg border border-line-strong px-3 text-sm" />
        <button className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">Search</button>
        {q && <Link href={query({ q: undefined, page: undefined })} className="inline-flex min-h-10 items-center px-3 text-sm text-brand-600 hover:underline">Clear</Link>}
      </form>

      <ApplicationCreateForm
        students={applicationStudents.map((student) => ({
          id: student.id,
          label: `${student.firstName} ${student.lastName} · ID ${student.id} · ${student.email}`,
        }))}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StageFilter current={validStage ?? ""} sort={sortKey} query={q} counts={counts} total={allCount} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ink-muted">Sort</span>
          {(Object.keys(SORTS) as (keyof typeof SORTS)[]).map((key) => (
            <Link
              key={key}
              href={query({ sort: key === "updated_desc" ? undefined : key })}
              aria-current={sortKey === key ? "true" : undefined}
              className={
                "inline-flex min-h-8 items-center rounded-full px-2.5 " +
                (sortKey === key
                  ? "bg-navy-900 font-semibold text-white dark:bg-slate-200 dark:text-navy-900"
                  : "border border-line text-ink-muted hover:bg-canvas dark:border-navy-700 dark:hover:bg-navy-800")
              }
            >
              {SORTS[key].label}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {total === 0 ? (
            <div className="space-y-2 py-12 text-center">
              <p className="text-sm text-ink-muted">
                {validStage ? `No applications are at the “${stageLabel(validStage)}” stage.` : "No applications yet."}
              </p>
              {validStage ? (
                <Link href="/application" className="inline-flex min-h-8 items-center text-sm font-medium text-brand-600 hover:underline">
                  Show all stages
                </Link>
              ) : (
                <a href="#new-application" className="inline-flex min-h-8 items-center text-sm font-medium text-brand-600 hover:underline">
                  Create the first application
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Cards below `sm`: the table needs seven narrow columns. */}
              <ul className="divide-y divide-line dark:divide-navy-700 sm:hidden">
                {applications.map((a) => (
                  <li key={a.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/application/${a.id}`} className="min-h-8 font-medium hover:underline">
                        {a.program.name}
                      </Link>
                      <Badge tone={STAGE_TONE[a.stage] ?? "slate"}>{stageLabel(a.stage)}</Badge>
                    </div>
                    <p className="text-xs text-ink-muted">
                      {a.program.university.name} · updated {formatDate(a.updatedAt)}
                    </p>
                    <CopyRecordId id={a.id} prefix="App" />
                    <Link href={`/users/${a.student.id}`} className="inline-flex min-h-8 items-center text-sm hover:underline">
                      {a.student.firstName} {a.student.lastName}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="overflow-x-auto">
                <table className="hidden w-full text-sm sm:table">
                  <caption className="sr-only">Applications in your pipeline</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                      <th scope="col" className="p-4">Application ID</th>
                      <th scope="col" className="p-4">Student</th>
                      <th scope="col" className="p-4">Program</th>
                      <th scope="col" className="p-4">University</th>
                      <th scope="col" className="p-4">Stage</th>
                      <th scope="col" className="p-4">Visa</th>
                      <th scope="col" className="p-4">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line dark:divide-navy-700">
                    {applications.map((a) => (
                      <tr key={a.id} className="hover:bg-canvas dark:hover:bg-navy-800/40">
                        <td className="p-4"><CopyRecordId id={a.id} prefix="App" /></td>
                        <td className="p-4">
                          <Link href={`/users/${a.student.id}`} className="inline-flex min-h-6 items-center font-medium hover:underline">
                            {a.student.firstName} {a.student.lastName}
                          </Link>
                          <p title={a.student.id} className="font-mono text-[11px] text-ink-muted">Student ID {shortRecordId(a.student.id)}</p>
                        </td>
                        <td className="p-4">
                          <Link href={`/application/${a.id}`} className="inline-flex min-h-6 items-center hover:underline">
                            {a.program.name}
                          </Link>
                        </td>
                        <td className="p-4 text-ink-muted">{a.program.university.name}</td>
                        <td className="p-4">
                          <Badge tone={STAGE_TONE[a.stage] ?? "slate"}>{stageLabel(a.stage)}</Badge>
                        </td>
                        <td className="p-4 text-ink-muted">
                          {a.program.visaRequired ? (a.visaStage ? humanize(a.visaStage) : "Required") : "Not required"}
                        </td>
                        <td className="p-4 text-ink-muted">{formatDate(a.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Students</h2>
            <p className="text-sm text-ink-muted">Student accounts in your scope, listed separately from their applications.</p>
          </div>
          <Link href="/users" className="inline-flex min-h-8 items-center text-sm font-medium text-brand-600 hover:underline">Open student directory</Link>
        </div>
        {applicationStudents.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-ink-muted">No students in your scope.</CardContent></Card>
        ) : (
          <Card><CardContent className="p-0"><ul className="divide-y divide-line dark:divide-navy-700">
            {applicationStudents.slice(0, 12).map((student) => (
              <li key={student.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="min-w-0"><Link href={`/users/${student.id}`} className="inline-flex min-h-6 items-center text-sm font-medium hover:underline">{student.firstName} {student.lastName}</Link><p className="break-all text-[11px] text-ink-muted">Student ID {student.id} · {student.email}</p></div>
                <span className="text-xs text-ink-muted">{student._count.applications} application{student._count.applications === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>{applicationStudents.length > 12 && <p className="border-t border-line px-3 py-2 text-xs text-ink-muted">Showing 12 of {applicationStudents.length}. Use the student directory to find another student by ID.</p>}</CardContent></Card>
        )}
      </section>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-ink-muted">
            Showing {firstRow}–{lastRow} of {total} application{total === 1 ? "" : "s"}
            {validStage ? ` at “${stageLabel(validStage)}”` : ""}.
          </p>
          {pageCount > 1 && (
            <nav aria-label="Application pages" className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link href={query({ page: currentPage - 1 })} className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 hover:bg-canvas dark:border-navy-700 dark:hover:bg-navy-800">
                  Previous
                </Link>
              ) : (
                <span aria-disabled="true" className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-ink-muted opacity-60 dark:border-navy-700">
                  Previous
                </span>
              )}
              <span className="text-xs text-ink-muted">
                Page {currentPage} of {pageCount}
              </span>
              {currentPage < pageCount ? (
                <Link href={query({ page: currentPage + 1 })} className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 hover:bg-canvas dark:border-navy-700 dark:hover:bg-navy-800">
                  Next
                </Link>
              ) : (
                <span aria-disabled="true" className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-ink-muted opacity-60 dark:border-navy-700">
                  Next
                </span>
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
