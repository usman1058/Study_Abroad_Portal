import Link from "next/link";
import { redirect } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { serializeProgram } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FeeDisplay } from "@/components/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Search" };

type SearchParams = Promise<{ q?: string; country?: string; level?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const { q = "", country = "", level = "" } = await searchParams;

  const results = await prisma.program.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { field: { contains: q, mode: "insensitive" } },
                { university: { name: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
        country ? { university: { country: { equals: country } } } : {},
        level ? { level } : {},
      ],
    },
    include: { university: true },
    take: 50,
  });

  const countries = await prisma.university.findMany({
    select: { country: true },
    distinct: ["country"],
    orderBy: { country: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Search</h1>
        <p className="text-sm text-slate-500">Search the university/program catalog.</p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-64 flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input name="q" defaultValue={q} placeholder="Program, field or university…" className="pl-9" />
        </div>
        <Select name="country" defaultValue={country} className="w-44">
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c.country} value={c.country}>{c.country}</option>
          ))}
        </Select>
        <Select name="level" defaultValue={level} className="w-40">
          <option value="">All levels</option>
          {["undergrad", "postgrad", "diploma", "foundation", "english", "other"].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </Select>
        <button type="submit" className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
          Search
        </button>
      </form>

      <Card>
        <CardContent className="p-0">
          {results.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">No results. Try a different search.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="p-4">University / Program</th>
                  <th className="p-4">Country</th>
                  <th className="p-4">Level</th>
                  <th className="p-4">Field</th>
                  <th className="p-4">Tuition</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {results.map((p) => {
                  const card = serializeProgram(p);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-4">
                        <p className="font-medium">{p.university.name}</p>
                        <p className="text-xs text-slate-500">{p.name}</p>
                      </td>
                      <td className="p-4">{p.university.country}</td>
                      <td className="p-4"><Badge tone="slate">{p.level}</Badge></td>
                      <td className="p-4">{p.field}</td>
                      <td className="p-4"><FeeDisplay amount={card.tuitionFee} /></td>
                      <td className="p-4 text-right">
                        <Link href={`/scholarships/${p.slug ?? p.id}`} className="text-sm font-medium text-brand-600 hover:underline">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}