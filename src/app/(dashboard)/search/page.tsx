import Link from "next/link";
import { redirect } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { serializeProgram } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FeeDisplay } from "@/components/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROGRAM_LEVELS, programLevelLabel } from "@/lib/constants";
import { getWorkingCountries } from "@/lib/working-countries";

export const metadata = { title: "Search" };

const RESULT_LIMIT = 50;

type SearchParams = Promise<{ q?: string; country?: string; level?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const { q: rawQ = "", country = "", level = "" } = await searchParams;
  const q = rawQ.slice(0, 200);

  const where = {
    AND: [
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { field: { contains: q, mode: "insensitive" as const } },
              { university: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {},
      country ? { university: { country: { equals: country } } } : {},
      level ? { level } : {},
    ],
  };

  const [total, results, countries] = await Promise.all([
    prisma.program.count({ where }),
    prisma.program.findMany({
      where,
      include: { university: true },
      orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
      take: RESULT_LIMIT,
    }),
    getWorkingCountries(),
  ]);

  const hasFilters = Boolean(q || country || level);
  const truncated = total > results.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-sm text-ink-muted">Find programs by name, field or university across the catalog.</p>
      </div>

      <form method="GET" role="search" className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_11rem_auto]">
        <div className="min-w-0">
          <Label htmlFor="search-q" className="sr-only">
            Search programs
          </Label>
          <div className="relative">
            <SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="search-q"
              name="q"
              type="search"
              maxLength={200}
              defaultValue={q}
              placeholder="Program, field or university…"
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="search-country" className="sr-only">
            Filter by country
          </Label>
          <Select id="search-country" name="country" defaultValue={country}>
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="search-level" className="sr-only">
            Filter by study level
          </Label>
          <Select id="search-level" name="level" defaultValue={level}>
            <option value="">All levels</option>
            {PROGRAM_LEVELS.map((l) => (
              <option key={l} value={l}>{programLevelLabel(l)}</option>
            ))}
          </Select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-ink-muted" aria-live="polite">
          {total === 0
            ? "No programs match."
            : `${total} program${total === 1 ? "" : "s"} found${hasFilters ? " for your filters" : ""}${
                truncated ? ` · showing the first ${results.length}` : ""
              }`}
        </p>
        {hasFilters && (
          <Link href="/search" className="inline-flex min-h-6 items-center text-sm font-medium text-brand-600 hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-ink-muted">
                {hasFilters ? "No results. Try a different search." : "The catalog is empty."}
              </p>
              {hasFilters && (
                <Link href="/search" className="mt-3 inline-flex min-h-6 items-center text-sm font-semibold text-brand-600 hover:underline">
                  Reset search
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] text-sm">
                <caption className="sr-only">University programs matching your search</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                    <th scope="col" className="p-4">University / Program</th>
                    <th scope="col" className="p-4">Country</th>
                    <th scope="col" className="p-4">Level</th>
                    <th scope="col" className="p-4">Field</th>
                    <th scope="col" className="p-4">Tuition</th>
                    <th scope="col" className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-navy-700">
                  {results.map((p) => {
                    const card = serializeProgram(p);
                    return (
                      <tr key={p.id} className="hover:bg-canvas dark:hover:bg-navy-800/40">
                        <td className="p-4">
                          <p className="font-medium">{p.university.name}</p>
                          <p className="text-xs text-ink-muted">{p.name}</p>
                        </td>
                        <td className="p-4">{p.university.country}</td>
                        <td className="p-4"><Badge tone="slate">{programLevelLabel(p.level)}</Badge></td>
                        <td className="p-4">{p.field}</td>
                        <td className="p-4"><FeeDisplay amount={card.tuitionFee} /></td>
                        <td className="p-4 text-right">
                          <Link
                            href={`/scholarships/${p.slug ?? p.id}`}
                            aria-label={`View ${p.name} at ${p.university.name}`}
                            className="inline-flex min-h-6 items-center justify-end rounded px-1 text-sm font-medium text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {truncated && (
        <p className="text-sm text-ink-muted">
          Only the first {RESULT_LIMIT} of {total} programs are shown. Add a keyword or filter to narrow the list.
        </p>
      )}
    </div>
  );
}
