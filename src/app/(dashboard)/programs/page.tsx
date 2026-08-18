import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink, MapPin } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listPrograms } from "@/lib/queries";
import { ProgramsFilter } from "@/components/programs-filter";
import { ShortlistToggle } from "@/components/shortlist-toggle";
import { FeeDisplay } from "@/components/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Programs" };

type SearchParams = Promise<{ q?: string; country?: string; city?: string }>;

export default async function ProgramsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");

  const { q = "", country = "", city = "" } = await searchParams;

  const programs = await prisma.program.findMany({
    where: {
      ...(q
        ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { field: { contains: q, mode: "insensitive" } }] }
        : {}),
      ...(country ? { university: { country } } : {}),
      ...(city ? { university: { city } } : {}),
    },
    include: { university: true },
    orderBy: [{ university: { name: "asc" } }, { name: "asc" }],
  });

  const universities = await prisma.university.findMany({
    orderBy: [{ country: "asc" }, { name: "asc" }],
    include: { _count: { select: { programs: true } } },
  });

  const countries = [...new Set(universities.map((u) => u.country).filter((c): c is string => !!c))].sort();
  const cities = [...new Set(universities.map((u) => u.city).filter((c): c is string => !!c))].sort();

  const grouped = universities
    .filter((u) => programs.some((p) => p.universityId === u.id))
    .map((u) => ({ university: u, programs: programs.filter((p) => p.universityId === u.id) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Programs</h1>
        <p className="text-sm text-slate-500">
          Browse every program, grouped by university and city.
        </p>
      </div>

      <ProgramsFilter
        countries={countries.map((c) => ({ value: c, label: c }))}
        cities={cities.map((c) => ({ value: c, label: c }))}
      />

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No programs match your filters.
          </CardContent>
        </Card>
      ) : (
        grouped.map(({ university, programs: uniPrograms }) => (
          <Card key={university.id}>
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-base font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                    {university.name[0]}
                  </span>
                  <div>
                    <h2 className="font-semibold">{university.name}</h2>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="h-3 w-3" /> {university.city ?? "—"}, {university.country}
                    </p>
                  </div>
                </div>
                <Badge tone="slate">{uniPrograms.length} program{uniPrograms.length > 1 ? "s" : ""}</Badge>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {uniPrograms.map((p) => {
                  const nextIntake = p.intakeDates
                    .map((d) => new Date(d))
                    .filter((d) => d.getTime() > Date.now())
                    .sort((a, b) => a.getTime() - b.getTime())[0];
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <Link href={`/scholarships/${p.slug ?? p.id}`} className="font-medium hover:text-brand-600 hover:underline">
                          {p.name}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <Badge tone="slate">{p.level}</Badge>
                          <span>{p.field}</span>
                          {nextIntake && <span>Next intake {formatDate(nextIntake)}</span>}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <FeeDisplay amount={Number(p.tuitionFee)} />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/scholarships/${p.slug ?? p.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
                        >
                          <ExternalLink className="h-3 w-3" /> View
                        </Link>
                        {user.role === "STUDENT" && <ShortlistToggle programId={p.id} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}