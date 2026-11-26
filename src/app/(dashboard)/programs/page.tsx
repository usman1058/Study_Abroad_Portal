import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { profileCompleteness } from "@/lib/queries";
import { ProgramsFilter } from "@/components/programs-filter";
import { BulkExportList, type BulkGroup } from "@/components/bulk-export-list";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { ProgramForm } from "@/components/program-form";
import { getWorkingCountries } from "@/lib/working-countries";

export const metadata = { title: "Programs" };

const PAGE_SIZE = 24;
const MAX_PAGE = 1000;

type SearchParams = Promise<{ q?: string; country?: string; city?: string; page?: string }>;

export default async function ProgramsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");

  const { q: rawQ = "", country = "", city = "", page: rawPage = "1" } = await searchParams;
  const q = rawQ.slice(0, 200);
  const requestedPage = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(rawPage, 10) || 1));

  // Country and city both constrain the same relation, so they must be merged
  // into one `university` filter instead of overwriting each other.
  const universityWhere = {
    ...(country ? { country } : {}),
    ...(city ? { city } : {}),
  };
  const where = {
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { field: { contains: q, mode: "insensitive" as const } }] }
      : {}),
    ...(Object.keys(universityWhere).length ? { university: universityWhere } : {}),
  };

  const total = await prisma.program.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const programs = await prisma.program.findMany({
    where,
    include: { university: true },
    orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const [universities, countries] = await Promise.all([prisma.university.findMany({
    orderBy: [{ country: "asc" }, { name: "asc" }],
    include: { _count: { select: { programs: true } } },
  }), getWorkingCountries()]);

  const cities = [...new Set(universities.map((u) => u.city).filter((c): c is string => !!c))].sort();

  const grouped = universities
    .filter((u) => programs.some((p) => p.universityId === u.id))
    // Program pages are ordered by university name, so group in the same order.
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((u) => ({ university: u, programs: programs.filter((p) => p.universityId === u.id) }));

  const isStudent = user.role === "STUDENT";
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const canViewAnalytics = isSuperAdmin || user.role === "MANAGER";
  const me = isStudent
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          phone: true,
          country: true,
          gender: true,
          birthday: true,
          passportNumber: true,
          countryOfResidence: true,
          nationality: true,
          cityOfResidence: true,
          address: true,
          motherName: true,
          fatherName: true,
        },
      })
    : null;
  const profileReady = Boolean(me && profileCompleteness(me as unknown as Parameters<typeof profileCompleteness>[0]) >= 80);

  const universityOptions = universities.map((u) => ({ id: u.id, name: u.name, country: u.country }));

  const bulkGroups: BulkGroup[] = grouped.map(({ university, programs: uniPrograms }) => ({
    universityId: university.id,
    universityName: university.name,
    city: university.city ?? "—",
    country: university.country,
    totalPrograms: university._count.programs,
    programs: uniPrograms.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      level: p.level,
      field: p.field,
      tuitionFee: Number(p.tuitionFee),
      nextIntake:
        p.intakeDates
          .map((d) => new Date(d))
          .filter((d) => d.getTime() > Date.now())
          .sort((a, b) => a.getTime() - b.getTime())[0]?.toISOString() ?? null,
      detail: {
        id: p.id,
        slug: p.slug,
        universityId: p.universityId,
        name: p.name,
        level: p.level,
        field: p.field,
        location: p.location,
        tuitionFee: Number(p.tuitionFee),
        applicationFee: p.applicationFee == null ? null : Number(p.applicationFee),
        intakeDates: p.intakeDates.map((date) => new Date(date).toISOString()),
        requiredDocuments: p.requiredDocuments,
        minGpa: p.minGpa,
        visaRequired: p.visaRequired,
        commissionRate: Number(p.commissionRate),
        tags: p.tags,
        offerTurnaroundDays: p.offerTurnaroundDays,
        collegeRank: p.collegeRank,
        eligibilityCriteria: p.eligibilityCriteria,
        courseDurationMonths: p.courseDurationMonths,
        universityLogoUrl: p.universityLogoUrl,
        university: p.university
          ? {
              id: p.university.id,
              name: p.university.name,
              country: p.university.country,
              city: p.university.city,
              logoUrl: p.university.logoUrl,
            }
          : null,
      },
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Programs</h1>
        <p className="text-sm text-ink-muted">
          Browse every program, grouped by university and city.
          {isStudent
            ? " Tick courses to build a shareable PDF shortlist, or apply directly."
            : " Tick programs to download their details together in one PDF."}
        </p>
        <p className="mt-1 text-sm text-ink-muted" aria-live="polite">
          {total === 0
            ? "No programs match your filters."
            : `${total} program${total === 1 ? "" : "s"}${q || country || city ? " match your filters" : " in the catalog"}`}
        </p></div>
        {isSuperAdmin && <div className="flex flex-wrap items-center gap-2"><Link href="/universities" className="inline-flex min-h-10 items-center rounded-lg border border-line-strong bg-white px-3 text-sm font-semibold text-ink hover:bg-canvas-subtle dark:border-navy-700 dark:bg-navy-900 dark:text-slate-100">Manage universities</Link><ProgramForm universities={universityOptions} /></div>}
      </div>

      <ProgramsFilter
        countries={countries.map((c) => ({ value: c, label: c }))}
        cities={cities.map((c) => ({ value: c, label: c }))}
      />

      <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/programs"
        query={{ q, country, city }}
        label="Program pages"
      />

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-ink-muted">
            No programs match your filters.
          </CardContent>
        </Card>
      ) : (
        <BulkExportList
          groups={bulkGroups}
          viewer={isStudent ? "student" : "staff"}
          profileReady={profileReady}
          canManage={isSuperAdmin}
          canViewAnalytics={canViewAnalytics}
          universities={universityOptions}
        />
      )}

      {total > PAGE_SIZE && (
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/programs"
          query={{ q, country, city }}
          label="Program pages (continued)"
        />
      )}
    </div>
  );
}
