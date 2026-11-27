import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, GraduationCap, Users, UserCheck, FileText } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FallbackLogo } from "@/components/fallback-logo";
import { Pagination } from "@/components/pagination";
import { humanize } from "@/lib/utils";
import { FeeDisplay } from "@/components/currency";

export const metadata = { title: "University details" };
const PAGE_SIZE = 25;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> };

export default async function UniversityDetailPage({ params, searchParams }: Props) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "SUPER_ADMIN") redirect("/universities");
  const [{ id }, { page: pageRaw = "1" }] = await Promise.all([params, searchParams]);
  const university = await prisma.university.findUnique({
    where: { id },
    include: { programs: { orderBy: { name: "asc" }, select: { id: true, name: true, level: true, field: true, tuitionFee: true } } },
  });
  if (!university) notFound();

  const appWhere = { program: { universityId: university.id } };
  const [studentGroups, enrolledGroups, appTotal, programActivity, enrolledByProgram, scholarshipLinks] = await Promise.all([
    prisma.application.groupBy({ by: ["studentId"], where: appWhere }),
    prisma.application.groupBy({ by: ["studentId"], where: { ...appWhere, stage: "ENROLLED" } }),
    prisma.application.count({ where: appWhere }),
    prisma.application.groupBy({ by: ["programId"], where: appWhere, _count: { _all: true, studentId: true } }),
    prisma.application.groupBy({ by: ["programId", "studentId"], where: { ...appWhere, stage: "ENROLLED" } }),
    prisma.scholarshipUniversity.findMany({ where: { universityId: university.id }, include: { scholarship: { select: { id: true, slug: true, name: true, category: true, awardType: true, awardValue: true, awardCurrency: true, isActive: true } } }, orderBy: { scholarship: { name: "asc" } } }),
  ]);
  const studentIds = studentGroups.map((item) => item.studentId);
  const enrolledStudentIds = new Set(enrolledGroups.map((item) => item.studentId));
  const pageCount = Math.max(1, Math.ceil(appTotal / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(pageRaw, 10) || 1));
  const applications = await prisma.application.findMany({
    where: appWhere,
    orderBy: { updatedAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: { id: true, stage: true, updatedAt: true, student: { select: { id: true, firstName: true, lastName: true, email: true } }, program: { select: { id: true, name: true } } },
  });
  const activityCounts = new Map(programActivity.map((item) => [item.programId, item._count._all]));
  const enrolledCounts = new Map<string, number>();
  for (const item of enrolledByProgram) enrolledCounts.set(item.programId, (enrolledCounts.get(item.programId) ?? 0) + 1);

  return <div className="mx-auto max-w-6xl space-y-7 pb-8">
    <Link href="/universities" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-300"><ArrowLeft aria-hidden className="h-4 w-4" /> Back to universities</Link>
    <header className="flex flex-col gap-5 rounded-2xl border border-line bg-gradient-to-br from-white to-brand-50/60 p-5 sm:flex-row sm:items-center sm:p-7 dark:border-navy-700 dark:from-navy-900 dark:to-brand-950/30">
      <FallbackLogo src={university.logoUrl} alt={`${university.name} logo`} className="h-20 w-20 shrink-0 rounded-2xl border border-line bg-white object-contain p-2 shadow-sm dark:border-navy-700" />
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">University overview</p><h1 className="mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl">{university.name}</h1><p className="mt-2 text-base text-ink-muted">{[university.city, university.country].filter(Boolean).join(", ")}</p>{university.website && <a href={university.website} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-9 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">University website <ExternalLink aria-hidden className="h-4 w-4" /></a>}</div>
    </header>

    <section aria-label="University application statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={<GraduationCap aria-hidden className="h-5 w-5" />} label="Programs" value={university.programs.length} />
      <Stat icon={<Users aria-hidden className="h-5 w-5" />} label="Students with applications" value={studentIds.length} />
      <Stat icon={<UserCheck aria-hidden className="h-5 w-5" />} label="Students enrolled" value={enrolledStudentIds.size} />
      <Stat icon={<FileText aria-hidden className="h-5 w-5" />} label="Total applications" value={appTotal} />
    </section>

    <section aria-labelledby="university-programs-heading" className="space-y-3">
      <div><h2 id="university-programs-heading" className="text-2xl font-bold">Programs and student activity</h2><p className="mt-1 text-sm text-ink-muted">See student applications and enrollment totals for every program at this university.</p></div>
      {university.programs.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-ink-muted">No programs are linked to this university yet.</CardContent></Card> : <div className="overflow-x-auto rounded-xl border border-line dark:border-navy-700"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-canvas-subtle text-xs uppercase tracking-wide text-ink-muted dark:bg-navy-800"><tr><th scope="col" className="px-4 py-3">Program</th><th scope="col" className="px-4 py-3">Level / field</th><th scope="col" className="px-4 py-3">Applications</th><th scope="col" className="px-4 py-3">Enrolled students</th><th scope="col" className="px-4 py-3">Tuition</th></tr></thead><tbody className="divide-y divide-line dark:divide-navy-700">{university.programs.map((program) => <tr key={program.id}><th scope="row" className="px-4 py-3 font-semibold"><Link href={`/programs/${program.id}`} className="text-brand-700 hover:underline dark:text-brand-300">{program.name}</Link></th><td className="px-4 py-3">{humanize(program.level)}{program.field ? ` · ${program.field}` : ""}</td><td className="px-4 py-3">{activityCounts.get(program.id) ?? 0}</td><td className="px-4 py-3">{enrolledCounts.get(program.id) ?? 0}</td><td className="px-4 py-3"><FeeDisplay amount={Number(program.tuitionFee)} /></td></tr>)}</tbody></table></div>}
    </section>

    <section aria-labelledby="university-scholarships-heading" className="space-y-3">
      <div><h2 id="university-scholarships-heading" className="text-2xl font-bold">Scholarships</h2><p className="mt-1 text-sm text-ink-muted">Scholarships associated with this university.</p></div>
      {scholarshipLinks.length === 0 ? <Card><CardContent className="py-8 text-sm text-ink-muted">No scholarships are linked to this university yet.</CardContent></Card> : <ul className="grid gap-3 md:grid-cols-2">{scholarshipLinks.map(({ scholarship }) => <li key={scholarship.id}><Card className="h-full"><CardContent className="flex h-full flex-col gap-3 p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold"><Link href={`/scholarships/${scholarship.slug}`} className="hover:text-brand-700 hover:underline dark:hover:text-brand-300">{scholarship.name}</Link></h3><Badge tone={scholarship.isActive ? "green" : "slate"}>{scholarship.isActive ? "Active" : "Inactive"}</Badge></div><p className="text-sm text-ink-muted">{humanize(scholarship.category)} · {humanize(scholarship.awardType)}{scholarship.awardValue != null ? ` · ${scholarship.awardValue.toString()} ${scholarship.awardCurrency}` : ""}</p></CardContent></Card></li>)}</ul>}
    </section>

    <section aria-labelledby="student-activity-heading" className="space-y-3">
      <div><h2 id="student-activity-heading" className="text-2xl font-bold">Student application activity</h2><p className="mt-1 text-sm text-ink-muted">Applications for this university, with student and program details. A student may appear more than once if they applied to multiple programs.</p></div>
      {applications.length === 0 ? <Card><CardContent className="py-8 text-sm text-ink-muted">No students have applied to this university yet.</CardContent></Card> : <><div className="overflow-x-auto rounded-xl border border-line dark:border-navy-700"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-canvas-subtle text-xs uppercase tracking-wide text-ink-muted dark:bg-navy-800"><tr><th scope="col" className="px-4 py-3">Student</th><th scope="col" className="px-4 py-3">Email</th><th scope="col" className="px-4 py-3">Program</th><th scope="col" className="px-4 py-3">Stage</th><th scope="col" className="px-4 py-3">Updated</th></tr></thead><tbody className="divide-y divide-line dark:divide-navy-700">{applications.map((application) => <tr key={application.id}><th scope="row" className="px-4 py-3 font-semibold"><Link href={`/users/${application.student.id}`} className="text-brand-700 hover:underline dark:text-brand-300">{application.student.firstName} {application.student.lastName}</Link></th><td className="px-4 py-3">{application.student.email}</td><td className="px-4 py-3">{application.program.name}</td><td className="px-4 py-3"><Badge tone={application.stage === "ENROLLED" ? "green" : "slate"}>{humanize(application.stage)}</Badge></td><td className="px-4 py-3">{application.updatedAt.toLocaleDateString()}</td></tr>)}</tbody></table></div><Pagination page={page} pageCount={pageCount} total={appTotal} pageSize={PAGE_SIZE} basePath={`/universities/${university.id}`} query={{}} label="Student application activity pages" /></>}
    </section>
  </div>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <Card><CardContent className="flex items-center gap-3 p-4 sm:p-5"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">{icon}</span><div><p className="text-sm font-medium text-ink-muted">{label}</p><p className="mt-0.5 text-2xl font-bold tabular-nums">{value.toLocaleString()}</p></div></CardContent></Card>;
}
