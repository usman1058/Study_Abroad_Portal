import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { profileCompleteness } from "@/lib/queries";
import { ProgramsFilter } from "@/components/programs-filter";
import { BulkExportList, type BulkGroup } from "@/components/bulk-export-list";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { getWorkingCountries } from "@/lib/working-countries";

export const metadata = { title: "Programs" };

const PAGE_SIZES = [6, 12, 24, 48] as const;
const MAX_PAGE = 1000;

type SearchParams = Promise<{ q?: string; country?: string; city?: string; universityId?: string; page?: string; perPage?: string }>;

export default async function ProgramsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");

  const { q: rawQ = "", country = "", city = "", universityId: requestedUniversityId = "", page: rawPage = "1", perPage: rawPerPage = "6" } = await searchParams;
  const q = rawQ.slice(0, 200);
  const PAGE_SIZE = PAGE_SIZES.includes(Number(rawPerPage) as (typeof PAGE_SIZES)[number]) ? Number(rawPerPage) : 6;
  const requestedPage = Math.min(MAX_PAGE, Math.max(1, Number.parseInt(rawPage, 10) || 1));

  // Country and city both constrain the same relation, so they must be merged
  // into one `university` filter instead of overwriting each other.
  const universityWhere = {
    ...(country ? { country } : {}),
    ...(city ? { city } : {}),
  };
  const [universities, countries] = await Promise.all([prisma.university.findMany({
    orderBy: [{ country: "asc" }, { name: "asc" }],
    include: { _count: { select: { programs: true } } },
  }), getWorkingCountries()]);
  const selectedUniversity = universities.find((u) => u.id === requestedUniversityId) ?? null;
  const universityId = selectedUniversity?.id ?? "";
  const where = {
    ...(q
      ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { field: { contains: q, mode: "insensitive" as const } }] }
      : {}),
    ...(universityId ? { universityId } : {}),
    ...(Object.keys(universityWhere).length ? { university: universityWhere } : {}),
  };

  const total = universityId ? await prisma.program.count({ where }) : 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  const programs = universityId ? await prisma.program.findMany({
    where,
    include: { university: true },
    orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  }) : [];

  const cities = [...new Set(universities.map((u) => u.city).filter((c): c is string => !!c))].sort();

  const grouped = selectedUniversity && programs.length
    ? [{ university: selectedUniversity, programs }]
    : [];

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
          Browse programs grouped by university and city. Choose how many programs to show per page.
          {isStudent
            ? " Tick courses to build a shareable PDF shortlist, or apply directly."
            : " Tick programs to download their details together in one PDF."}
        </p>
        <p className="mt-1 text-sm text-ink-muted" aria-live="polite">
          {!universityId
            ? `${universities.length} universit${universities.length === 1 ? "y" : "ies"} in the catalog. Choose one to browse its programs.`
            : total === 0
            ? "No programs match your filters."
            : `${total} program${total === 1 ? "" : "s"}${q || country || city ? " match your filters" : " at this university"}`}
        </p></div>
        {isSuperAdmin && <div className="flex flex-wrap items-center gap-2"><Link href="/universities" className="inline-flex min-h-10 items-center rounded-lg border border-line-strong bg-white px-3 text-sm font-semibold text-ink hover:bg-canvas-subtle dark:border-navy-700 dark:bg-navy-900 dark:text-slate-100">Manage universities</Link><Link href="/programs/new" className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">+ Add program</Link></div>}
      </div>

      <ProgramsFilter
        countries={countries.map((c) => ({ value: c, label: c }))}
        cities={cities.map((c) => ({ value: c, label: c }))}
        universities={universities.map((u) => ({ value: u.id, label: `${u.name} · ${u.country}` }))}
      />

      {universityId && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/70 p-4 dark:border-indigo-900/60 dark:from-indigo-950/40 dark:via-navy-900 dark:to-violet-950/30">
        <div><p className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Selected university</p><p className="mt-1 text-lg font-bold">{selectedUniversity?.name}</p><p className="text-sm text-ink-muted">{selectedUniversity?.city ? `${selectedUniversity.city}, ` : ""}{selectedUniversity?.country} · {total} program{total === 1 ? "" : "s"}</p></div>
        <Link href="/programs" className="inline-flex min-h-10 items-center rounded-xl border border-indigo-200 bg-white px-4 text-sm font-semibold text-indigo-800 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-navy-900 dark:text-indigo-200">Browse all universities</Link>
      </div>}

      {universityId && <Pagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
        basePath="/programs"
        query={{ q, country, city, universityId, perPage: String(PAGE_SIZE) }}
        label="Program pages"
      />}

      {!universityId ? (
        <section aria-labelledby="university-list-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2"><div><h2 id="university-list-heading" className="text-xl font-bold">Universities</h2><p className="text-sm text-ink-muted">Choose a university to browse its programs.</p></div><p className="text-sm text-ink-muted">{universities.length} universities</p></div>
          {universities.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-ink-muted">No universities have been added yet.</CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{universities.map((university) => <Link key={university.id} href={`/programs?universityId=${encodeURIComponent(university.id)}&perPage=${PAGE_SIZE}`} className="group rounded-2xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-indigo-900/60 dark:from-navy-900 dark:via-indigo-950/20 dark:to-violet-950/30"><p className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">{university.country}</p><h3 className="mt-2 text-lg font-bold group-hover:text-indigo-700 dark:group-hover:text-indigo-300">{university.name}</h3><p className="mt-1 text-sm text-ink-muted">{university.city || "Location to be confirmed"}</p><div className="mt-5 flex items-center justify-between border-t border-indigo-100/80 pt-3 text-sm dark:border-indigo-900/50"><span className="font-semibold">{university._count.programs} program{university._count.programs === 1 ? "" : "s"}</span><span className="font-bold text-indigo-700 group-hover:translate-x-0.5 dark:text-indigo-300">View programs →</span></div></Link>)}</div>}
        </section>
      ) : grouped.length === 0 ? (
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

      {universityId && total > PAGE_SIZE && (
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={PAGE_SIZE}
          basePath="/programs"
          query={{ q, country, city, universityId, perPage: String(PAGE_SIZE) }}
          label="Program pages (continued)"
        />
      )}
    </div>
  );
}
