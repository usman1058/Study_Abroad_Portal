import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { ProgramCard } from "@/components/program-card";
import { getPrograms } from "@/lib/portal";

export const metadata = pageMetadata({ title: 'Study programs and universities', description: 'Search study abroad programs by destination, subject, and study level. Compare tuition, entry requirements, and university details in the CheckMyUni catalog.', path: '/applications', keywords: 'study abroad programs, university courses, international students' });

type SearchParams = Promise<{ q?: string; country?: string; level?: string; field?: string; page?: string }>;

function hrefFor(params: Record<string, string>, page?: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  if (page && page > 1) query.set("page", String(page));
  const queryString = query.toString();
  return queryString ? `/applications?${queryString}` : "/applications";
}

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = await searchParams;
  const filters = { q: (raw.q ?? "").trim().slice(0, 120), country: raw.country ?? "", level: raw.level ?? "", field: raw.field ?? "", page: raw.page ?? "1" };
  const catalog = await getPrograms(filters);
  const params = { q: filters.q, country: filters.country, level: filters.level, field: filters.field };

  return <>
    <section className="bg-ivory py-14 sm:py-20"><div className="site-container"><p className="eyebrow">Explore opportunities</p><h1 className="mt-3 max-w-3xl font-display text-4xl font-extrabold leading-tight text-navy sm:text-5xl">Find the program that fits your next step.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Search the program catalog, compare the details, and open a listing to review entry requirements and next steps.</p></div></section>
    <section className="section-space pt-10"><div className="site-container">
      <form action="/applications" method="get" role="search" aria-label="Search study programs" className="surface-card grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-[1.5fr_1fr_1fr_1fr_auto] xl:items-end">
        <div><label htmlFor="catalog-q" className="field-label">Search programs</label><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="catalog-q" className="field-control pl-10" name="q" type="search" defaultValue={filters.q} placeholder="Program, subject, university…" /></div></div>
        <div><label htmlFor="catalog-country" className="field-label">Destination</label><select id="catalog-country" name="country" defaultValue={filters.country} className="field-control"><option value="">All destinations</option>{catalog.filters.countries.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div><label htmlFor="catalog-level" className="field-label">Study level</label><select id="catalog-level" name="level" defaultValue={filters.level} className="field-control"><option value="">All levels</option>{catalog.filters.levels.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div><label htmlFor="catalog-field" className="field-label">Subject area</label><select id="catalog-field" name="field" defaultValue={filters.field} className="field-control"><option value="">All subjects</option>{catalog.filters.fields.map((value) => <option key={value} value={value}>{value}</option>)}</select></div>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-1"><button className="btn-primary w-full"><SlidersHorizontal aria-hidden="true" className="h-4 w-4" /> Apply filters</button>{Object.values(params).some(Boolean) && <Link href="/applications" className="btn-secondary">Reset</Link>}</div>
      </form>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-2xl font-bold text-navy">Study programs</h2><p className="mt-1 text-sm text-slate-600" aria-live="polite">{catalog.available ? `${catalog.pagination.total} ${catalog.pagination.total === 1 ? "program" : "programs"} found` : "Catalog connection unavailable"}</p></div>{catalog.pagination.pageCount > 1 && <p className="text-sm text-slate-500">Page {catalog.pagination.page} of {catalog.pagination.pageCount}</p>}</div>
      {!catalog.available ? <div role="status" className="surface-card mt-5 p-8 text-center"><h3 className="font-display text-lg font-bold text-navy">We can’t load program listings right now</h3><p className="mt-2 text-sm text-slate-600">Please try again shortly, or contact an advisor and we’ll help you explore options.</p><Link href="/contact" className="btn-primary mt-5">Contact an advisor <ArrowRight className="h-4 w-4" /></Link></div>
        : catalog.programs.length ? <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{catalog.programs.map((program) => <ProgramCard key={program.id} program={program} />)}</div>
        : <div className="surface-card mt-5 p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-soft text-blue"><Search className="h-5 w-5" /></div><h3 className="mt-4 font-display text-xl font-bold text-navy">No programs match those filters</h3><p className="mt-2 text-sm text-slate-600">Try a different keyword or clear one or more filters.</p><Link href="/applications" className="btn-secondary mt-5">Clear filters</Link></div>}
      {catalog.available && catalog.pagination.pageCount > 1 && <nav aria-label="Program result pages" className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5"><span className="text-sm text-slate-500">Showing page {catalog.pagination.page} of {catalog.pagination.pageCount}</span><div className="flex gap-2">{catalog.pagination.page > 1 && <Link className="btn-secondary" href={hrefFor(params, catalog.pagination.page - 1)}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Previous</Link>}{catalog.pagination.page < catalog.pagination.pageCount && <Link className="btn-secondary" href={hrefFor(params, catalog.pagination.page + 1)}>Next<ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>}</div></nav>}
    </div></section>
  </>;
}
