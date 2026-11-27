import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, MapPin, Award, CalendarDays, GraduationCap, MessageCircle, ArrowRight, Sparkles } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getWorkingCountries } from "@/lib/working-countries";
import { Pagination } from "@/components/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/delete-button";
import { humanize } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import { ResponsiveFilterPanel } from "@/components/responsive-filter-panel";

export const metadata = { title: "Scholarships" };
const PAGE_SIZE = 12;
const categories = ["MERIT", "NEED_BASED", "COUNTRY_SPECIFIC", "UNIVERSITY_SPECIFIC", "PROGRAM_SPECIFIC", "OTHER"] as const;
const awards = ["PERCENTAGE", "FIXED_AMOUNT", "FULL_TUITION", "OTHER"] as const;

export default async function ScholarshipsPage({ searchParams }: { searchParams: Promise<{ q?: string; country?: string; applicantCountry?: string; subject?: string; level?: string; category?: string; award?: string; page?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/");
  const { q: rawQ = "", country = "", applicantCountry = "", subject = "", level = "", category = "", award = "", page: pageRaw = "1" } = await searchParams;
  const q = rawQ.trim().slice(0, 120);
  const filterClauses: Prisma.ScholarshipWhereInput[] = [];
  if (user.role !== "SUPER_ADMIN") filterClauses.push({ isActive: true });
  if (category && categories.includes(category as (typeof categories)[number])) filterClauses.push({ category: category as (typeof categories)[number] });
  if (award && awards.includes(award as (typeof awards)[number])) filterClauses.push({ awardType: award as (typeof awards)[number] });
  // A scholarship with no level restrictions can apply to any level.
  if (level) filterClauses.push({ OR: [{ studyLevels: { has: level } }, { studyLevels: { isEmpty: true } }] });
  if (subject) filterClauses.push({ subject: { contains: subject, mode: "insensitive" } });
  if (country) filterClauses.push({ universities: { some: { university: { country: { equals: country, mode: "insensitive" } } } } });
  if (applicantCountry) filterClauses.push({ eligibleCountries: { has: applicantCountry } });
  if (q) filterClauses.push({ OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { providerName: { contains: q, mode: "insensitive" as const } },
      { description: { contains: q, mode: "insensitive" as const } },
      { subject: { contains: q, mode: "insensitive" as const } },
      { universities: { some: { university: { name: { contains: q, mode: "insensitive" as const } } } } },
      { programs: { some: { program: { name: { contains: q, mode: "insensitive" as const } } } } },
    ] });
  const filters: Prisma.ScholarshipWhereInput = { AND: filterClauses };
  const total = await prisma.scholarship.count({ where: filters });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(pageCount, Math.max(1, Number.parseInt(pageRaw, 10) || 1));
  const [scholarships, countries, applicantCountryRows] = await Promise.all([
    prisma.scholarship.findMany({ where: filters, orderBy: [{ isActive: "desc" }, { deadline: "asc" }, { name: "asc" }], skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { universities: { include: { university: { select: { id: true, name: true, country: true } } } }, programs: { include: { program: { select: { id: true, name: true, level: true, field: true, university: { select: { name: true } } } } } } } }),
    getWorkingCountries(),
    prisma.scholarship.findMany({ where: user.role === "SUPER_ADMIN" ? {} : { isActive: true }, select: { eligibleCountries: true } }),
  ]);
  const applicantCountries = [...new Set(applicantCountryRows.flatMap((item) => item.eligibleCountries))].sort((a, b) => a.localeCompare(b));
  const isAdmin = user.role === "SUPER_ADMIN";
  const hasFilters = Boolean(q || country || applicantCountry || subject || level || category || award);

  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <header className="flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-navy-950 via-[#263b78] to-[#5b3aab] p-6 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><p className="text-sm font-semibold text-blue-100">Funding opportunities</p><h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Scholarships</h1><p className="mt-2 max-w-2xl text-base leading-7 text-blue-50">Search awards by university, study level, subject, award basis, and eligibility.</p></div>{isAdmin && <Link href="/scholarships/new" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-brand-800 shadow-sm hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-brand-700">+ Add scholarship</Link>}</header>

    <ResponsiveFilterPanel title="Scholarship filters" activeCount={[q, country, applicantCountry, subject, level, category, award].filter(Boolean).length}>
    <form action="/scholarships" method="get" role="search" className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-navy-700 dark:bg-navy-900">
      <label className="text-sm font-medium sm:col-span-2 lg:col-span-4">Search scholarships<input name="q" type="search" maxLength={120} defaultValue={q} placeholder="Scholarship, sponsor, university, or program" className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-base dark:border-navy-700 dark:bg-navy-900" /></label>
      <label className="text-sm font-medium">Study destination<select name="country" defaultValue={country} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-900"><option value="">All destinations</option>{countries.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-medium">Eligible applicant country<select name="applicantCountry" defaultValue={applicantCountry} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-900"><option value="">Any applicant country</option>{applicantCountries.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm font-medium">Study level<select name="level" defaultValue={level} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-900"><option value="">All levels</option>{(["undergrad", "postgrad", "phd", "diploma", "foundation", "english", "other"]).map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
      <label className="text-sm font-medium">Award type<select name="award" defaultValue={award} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-900"><option value="">All award types</option>{awards.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
      <label className="text-sm font-medium">Scholarship category<select name="category" defaultValue={category} className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-900"><option value="">All categories</option>{categories.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
      <label className="text-sm font-medium sm:col-span-2">Subject / field<input name="subject" defaultValue={subject} maxLength={120} placeholder="For example: Engineering" className="mt-1 min-h-11 w-full rounded-lg border border-line-strong bg-white px-3 text-sm dark:border-navy-700 dark:bg-navy-900" /></label>
      <button className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"><Search aria-hidden className="h-4 w-4" /> Apply filters</button>
    </form>
    </ResponsiveFilterPanel>

    <div className="flex flex-wrap items-center justify-between gap-2"><p aria-live="polite" className="text-sm text-ink-muted">{total.toLocaleString()} scholarship{total === 1 ? "" : "s"}{q || country || applicantCountry || subject || level || category || award ? " match your filters" : " in the catalog"}</p><Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/scholarships" query={{ q, country, applicantCountry, subject, level, category, award }} label="Scholarship pages" /></div>

    {scholarships.length === 0 ? hasFilters ? <Card><CardContent className="flex flex-col items-center px-5 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"><Search aria-hidden className="h-6 w-6" /></span><h2 className="mt-4 text-xl font-bold">No scholarships match these filters</h2><p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">Try another destination, study level, or eligibility option. You can also clear the filters and browse the full catalog.</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/scholarships" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">Clear filters <ArrowRight aria-hidden className="h-4 w-4" /></Link>{isAdmin && <Link href="/scholarships/new" className="inline-flex min-h-11 items-center rounded-lg border border-line-strong px-4 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:hover:bg-navy-800">Add a scholarship</Link>}</div></CardContent></Card> : <Card className="overflow-hidden border-brand-200 dark:border-navy-700"><CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-violet-100 text-brand-700 dark:from-blue-950 dark:to-violet-950 dark:text-brand-200"><Sparkles aria-hidden className="h-6 w-6" /></span><div><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Funding opportunities</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">{isAdmin ? "Your scholarship catalog is ready to grow" : "More scholarship opportunities are on the way"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">{isAdmin ? "Add verified awards here so students can explore eligibility, participating universities, and supported programs." : "We’re preparing scholarship information for students. Check back for new listings, or contact our team for guidance on funding your studies."}</p><p className="mt-3 text-sm font-medium text-ink">In the meantime, explore programs and universities, and ask our team if you need help finding funding options.</p></div></div><div className="flex flex-col gap-2 sm:flex-row lg:flex-col">{isAdmin ? <Link href="/scholarships/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"><GraduationCap aria-hidden className="h-4 w-4" /> Add first scholarship</Link> : <Link href="/messages" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"><MessageCircle aria-hidden className="h-4 w-4" /> Ask our team</Link>}<Link href="/programs" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line-strong px-4 text-sm font-semibold hover:bg-canvas-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-navy-700 dark:hover:bg-navy-800">Explore programs <ArrowRight aria-hidden className="h-4 w-4" /></Link></div></CardContent></Card> : <ul className="grid gap-4 lg:grid-cols-2">{scholarships.map((scholarship) => {
      const award = scholarship.awardType === "PERCENTAGE" && scholarship.awardValue != null ? `${scholarship.awardValue.toString()}% tuition award` : scholarship.awardType === "FIXED_AMOUNT" && scholarship.awardValue != null ? `${scholarship.awardCurrency} ${scholarship.awardValue.toString()}` : humanize(scholarship.awardType);
      const linkedUniversities = scholarship.universities.map(({ university }) => university);
      return <li key={scholarship.id}><Card className="h-full transition hover:border-brand-300 hover:shadow-md"><CardContent className="flex h-full flex-col p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{scholarship.providerName || humanize(scholarship.category)}</p><h2 className="mt-1 text-xl font-bold"><Link href={`/scholarships/${scholarship.slug}`} className="hover:text-brand-700 hover:underline dark:hover:text-brand-300">{scholarship.name}</Link></h2></div><Badge tone={scholarship.isActive ? "green" : "slate"}>{scholarship.isActive ? "Active" : "Inactive"}</Badge></div><p className="mt-3 line-clamp-3 text-base leading-7 text-ink-muted">{scholarship.description}</p><div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p className="flex items-center gap-2"><Award aria-hidden className="h-4 w-4 shrink-0 text-brand-600" /><span className="font-semibold">{award}</span></p>{scholarship.deadline && <p className="flex items-center gap-2"><CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-brand-600" />Deadline {scholarship.deadline.toLocaleDateString()}</p>}<p className="flex items-start gap-2 sm:col-span-2"><MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" /><span>{linkedUniversities.length ? linkedUniversities.map((item) => `${item.name} · ${item.country}`).join("; ") : "University-wide / linked program award"}</span></p></div><div className="mt-4 flex flex-wrap gap-2">{scholarship.studyLevels.map((item) => <Badge key={item} tone="slate">{humanize(item)}</Badge>)}{scholarship.subject && <Badge tone="brand">{scholarship.subject}</Badge>}{scholarship.eligibleCountries.map((item) => <Badge key={item} tone="amber">Eligible: {item}</Badge>)}</div><div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5"><Link href={`/scholarships/${scholarship.slug}`} className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">View scholarship</Link>{isAdmin && <div className="flex items-center gap-2"><Link href={`/scholarships/${scholarship.id}/edit`} className="inline-flex min-h-10 items-center rounded-lg border border-line-strong px-3 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:hover:bg-navy-800">Edit</Link><DeleteButton endpoint={`/api/scholarships/${scholarship.id}`} itemName={scholarship.name} /></div>}</div></CardContent></Card></li>;
    })}</ul>}
    <Pagination page={page} pageCount={pageCount} total={total} pageSize={PAGE_SIZE} basePath="/scholarships" query={{ q, country, applicantCountry, subject, level, category, award }} label="Scholarship pages (continued)" />
  </div>;
}
