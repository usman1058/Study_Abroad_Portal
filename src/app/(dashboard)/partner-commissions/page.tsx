import Link from "next/link";
import { redirect } from "next/navigation";
import { FeeDisplay } from "@/components/currency";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { serializeProgram } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommissionRateEditor } from "@/components/commission-rate-editor";

export const metadata = { title: "Partner Commissions" };
const PAGE_SIZE = 20;

export default async function PartnerCommissionsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const user = await currentUser();
  if (!user || user.role === "STUDENT" || user.role === "COUNSELOR") redirect("/");

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const where = q ? { OR: [{ name: { contains: q, mode: "insensitive" as const } }, { university: { name: { contains: q, mode: "insensitive" as const } } }] } : {};
  const parsedPage = Number(params.page);
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const [total, weighted] = await Promise.all([
    prisma.program.count({ where }),
    prisma.$queryRaw<{ tuitionTotal: unknown; weightedTotal: unknown }[]>`
      SELECT COALESCE(SUM(p."tuitionFee"), 0) AS "tuitionTotal",
             COALESCE(SUM(p."tuitionFee" * p."commissionRate"), 0) AS "weightedTotal"
      FROM "Program" p
      JOIN "University" u ON u.id = p."universityId"
      WHERE (${q} = '' OR p.name ILIKE '%' || ${q} || '%' OR u.name ILIKE '%' || ${q} || '%')
    `,
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total > 0 && requestedPage > pageCount) redirect(`/partner-commissions?${new URLSearchParams({ ...(q ? { q } : {}), ...(pageCount > 1 ? { page: String(pageCount) } : {}) })}`);
  const programs = await prisma.program.findMany({ where, include: { university: true }, orderBy: [{ university: { name: "asc" } }, { name: "asc" }], skip: (requestedPage - 1) * PAGE_SIZE, take: PAGE_SIZE });
  const tuitionWeight = Number(weighted[0]?.tuitionTotal ?? 0);
  const avgRate = tuitionWeight ? Number(weighted[0]?.weightedTotal ?? 0) / tuitionWeight : 0;
  const query = (page?: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (page && page > 1) next.set("page", String(page));
    return next.size ? `/partner-commissions?${next}` : "/partner-commissions";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner Commissions</h1>
        <p className="text-sm text-ink-muted">
          {user.role === "SUPER_ADMIN" ? "Set and update the partner commission rate for each program." : "Commission rates are set by the portal owner."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card><CardContent className="p-5"><p className="text-xs text-ink-muted">Programs</p><p className="mt-1 text-2xl font-bold">{total}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-ink-muted">Average rate</p><p className="mt-1 text-2xl font-bold">{avgRate.toFixed(1)}%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission rates by program</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="mb-4 flex flex-wrap gap-2" role="search"><label htmlFor="commission-search" className="sr-only">Search program or university</label><input id="commission-search" name="q" defaultValue={q} placeholder="Search program or university" className="min-h-10 min-w-0 flex-1 rounded-lg border border-line-strong px-3 text-sm" /><button className="min-h-10 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white">Search</button></form>
          <ul className="divide-y divide-line sm:hidden">{programs.map((p) => <li key={p.id} className="space-y-2 p-4"><Link href={`/programs/${p.id}`} className="inline-flex min-h-6 font-medium hover:underline">{p.name}</Link><p className="text-sm text-ink-muted">{p.university.name}</p><div className="flex justify-between gap-2 text-sm"><span>Tuition <FeeDisplay amount={serializeProgram(p).tuitionFee} /></span><Badge tone="green">{Number(p.commissionRate)}%</Badge></div>{user.role === "SUPER_ADMIN" && <CommissionRateEditor programId={p.id} programName={p.name} initialRate={Number(p.commissionRate)} />}</li>)}</ul>
            <div className="hidden overflow-x-auto sm:block" tabIndex={0} role="region" aria-label="Commission rates by program"><table className="w-full text-sm"><caption className="sr-only">Commission rates by program</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                  <th scope="col" className="p-4">Program</th>
                  <th scope="col" className="p-4">University</th>
                  <th scope="col" className="p-4">Tuition</th>
                  <th scope="col" className="p-4">Rate</th>
                  {user.role === "SUPER_ADMIN" && <th scope="col" className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-navy-700">
                {programs.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4">
                      <Link href={`/programs/${p.id}`} className="inline-flex min-h-6 items-center font-medium hover:underline">{p.name}</Link>
                    </td>
                    <td className="p-4 text-ink-muted">{p.university.name}</td>
                    <td className="p-4"><FeeDisplay amount={serializeProgram(p).tuitionFee} /></td>
                    <td className="p-4">
                      <Badge tone="green">{Number(p.commissionRate)}%</Badge>
                    </td>
                    {user.role === "SUPER_ADMIN" && <td className="p-4 text-right"><CommissionRateEditor programId={p.id} programName={p.name} initialRate={Number(p.commissionRate)} /></td>}
                  </tr>
                ))}
              </tbody>
            </table></div>
          {total === 0 && <p className="py-6 text-center text-sm text-ink-muted">No programs match this search.</p>}
        </CardContent>
      </Card>
      {total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-ink-muted">Showing {(requestedPage - 1) * PAGE_SIZE + 1}–{Math.min(requestedPage * PAGE_SIZE, total)} of {total} programs.</p>{pageCount > 1 && <nav aria-label="Commission program pages" className="flex gap-2">{requestedPage > 1 && <Link className="inline-flex min-h-9 items-center rounded-lg border px-3" href={query(requestedPage - 1)}>Previous</Link>}<span>Page {requestedPage} of {pageCount}</span>{requestedPage < pageCount && <Link className="inline-flex min-h-9 items-center rounded-lg border px-3" href={query(requestedPage + 1)}>Next</Link>}</nav>}</div>}
    </div>
  );
}
