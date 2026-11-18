import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { ApplicationCreateForm } from "@/components/application-create-form";
import { APPLICATION_STAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StageFilter } from "@/components/stage-filter";
import { formatDate, humanize } from "@/lib/utils";
import type { ApplicationStage } from "@/generated/prisma/client";

export const metadata = { title: "Applications" };

type SearchParams = Promise<{ stage?: string; page?: string; sort?: string }>;

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

  const { stage = "", page = "", sort = "" } = await searchParams;
  const validStage = APPLICATION_STAGES.some((s) => s.value === stage) ? (stage as ApplicationStage) : null;
  const sortKey = (Object.keys(SORTS) as (keyof typeof SORTS)[]).find((key) => key === sort) ?? "updated_desc";

  const scope = user.role === "SUPER_ADMIN" || user.role === "MANAGER" ? {} : { student: studentScopeWhere(user) };
  const where = { ...scope, ...(validStage ? { stage: validStage } : {}) };
  const parsedPage = Number(page);
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [total, stageGroups, applicationStudents] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.groupBy({ by: ["stage"], where: scope, _count: { _all: true } }),
    prisma.user.findMany({
      where: studentScopeWhere(user),
      select: { id: true, firstName: true, lastName: true, email: true },
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
          className="inline-flex min-h-9 items-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          New application
        </a>
      </div>

      <ApplicationCreateForm
        students={applicationStudents.map((student) => ({
          id: student.id,
          label: student.firstName + " " + student.lastName + " (" + student.email + ")",
        }))}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StageFilter current={validStage ?? ""} sort={sortKey} counts={counts} total={allCount} />
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
                        <td className="p-4">
                          <Link href={`/users/${a.student.id}`} className="inline-flex min-h-6 items-center font-medium hover:underline">
                            {a.student.firstName} {a.student.lastName}
                          </Link>
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
