import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, MapPin, Search } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Scholarships" };

export default async function ScholarshipsPage({ searchParams }: { searchParams: Promise<{ q?: string; country?: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/");
  const { q: rawQuery = "", country = "" } = await searchParams;
  const q = rawQuery.trim().slice(0, 100);
  // Scholarship offers use the scholarship catalogue API and live as program
  // records, so this route gives that catalogue its own search and presentation.
  const programs = await prisma.program.findMany({
    where: {
      ...(country ? { university: { country } } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { field: { contains: q, mode: "insensitive" } }, { university: { name: { contains: q, mode: "insensitive" } } }] } : {}),
    },
    include: { university: true },
    orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
    take: 100,
  });
  const countries = [...new Set(programs.map((p) => p.university.country))].sort();
  return <div className="space-y-6">
    <header className="rounded-2xl bg-gradient-to-r from-navy-900 to-brand-700 p-6 text-white shadow-sm">
      <div className="flex items-center gap-3"><GraduationCap className="h-8 w-8" /><div><h1 className="text-2xl font-bold">Scholarships & study opportunities</h1><p className="mt-1 text-sm text-blue-100">Search funding and study options by course, field, or university. Open an offer to see the university and application details.</p></div></div>
    </header>
    <form action="/scholarships" method="get" role="search" className="flex flex-wrap gap-2 rounded-xl border border-line bg-white p-3 dark:bg-navy-900">
      <label htmlFor="scholarship-search" className="sr-only">Search scholarships by name, field, or university</label><div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-line-strong px-3"><Search className="h-4 w-4 text-ink-muted" /><input id="scholarship-search" name="q" defaultValue={q} placeholder="Search name, field, university…" className="min-h-10 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
      <label htmlFor="scholarship-country" className="sr-only">Filter scholarships by country</label><select id="scholarship-country" name="country" defaultValue={country} className="min-h-10 rounded-lg border border-line-strong px-3 text-sm"><option value="">All countries</option>{countries.map((c) => <option key={c} value={c}>{c}</option>)}</select><button className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white">Search</button>
    </form>
    <p className="text-sm text-ink-muted">{programs.length} opportunities shown{programs.length === 100 ? " · refine your search to narrow the list" : ""}</p>
    {programs.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-ink-muted">No scholarship opportunities match this search.</CardContent></Card> : <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{programs.map((program) => <li key={program.id}><Card className="h-full transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"><CardContent className="flex h-full flex-col p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-semibold"><Link href={`/scholarships/${program.slug ?? program.id}`} className="hover:text-brand-700 hover:underline">{program.name}</Link></h2><p className="mt-1 text-sm text-ink-muted">{program.university.name}</p></div><Badge tone="brand">{program.level}</Badge></div><p className="mt-4 flex items-center gap-1.5 text-xs text-ink-muted"><MapPin className="h-3.5 w-3.5" />{program.university.city ? `${program.university.city}, ` : ""}{program.university.country}</p><p className="mt-2 text-sm">{program.field}</p><div className="mt-auto pt-4"><Link href={`/scholarships/${program.slug ?? program.id}`} className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700">View opportunity</Link></div></CardContent></Card></li>)}</ul>}
  </div>;
}
