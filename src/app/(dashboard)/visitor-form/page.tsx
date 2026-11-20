import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { VisitorLeadForm } from "@/components/visitor-lead-form";
import { DeleteButton } from "@/components/delete-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, humanize } from "@/lib/utils";
import { VisitorLeadActions } from "@/components/visitor-lead-actions";

export const metadata = { title: "Visitor Form" };

const PAGE_SIZE = 25;
const statuses = ["NEW", "CONTACTED", "CONVERTED", "CLOSED"] as const;

export default async function VisitorFormPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const user = await currentUser();
  if (!user || !["SUPER_ADMIN", "MANAGER"].includes(user.role)) redirect("/home");

  const params = await searchParams;
  const status = statuses.includes(params.status as typeof statuses[number]) ? params.status as typeof statuses[number] : "";
  const pageNum = Number(params.page);
  const requestedPage = Number.isSafeInteger(pageNum) && pageNum > 0 ? pageNum : 1;
  const where = status ? { status } : {};

  const [total, leads] = await Promise.all([prisma.visitorLead.count({ where }), prisma.visitorLead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (requestedPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  })]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total > 0 && requestedPage > pageCount) redirect(`/visitor-form?${new URLSearchParams({ ...(status ? { status } : {}), ...(pageCount > 1 ? { page: String(pageCount) } : {}) })}`);
  const query = (nextPage?: number) => {
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (nextPage && nextPage > 1) next.set("page", String(nextPage));
    return next.size ? `/visitor-form?${next}` : "/visitor-form";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
        <h1 className="text-2xl font-bold">Visitor leads</h1>
          <p className="text-sm text-ink-muted">Capture, contact, and track enquiries. {total} total lead{total === 1 ? "" : "s"}.</p>
        </div>
        <VisitorLeadForm />
      </div>

      <Card>
        <CardHeader><CardTitle>Leads</CardTitle></CardHeader>
        <CardContent>
          <nav aria-label="Lead status" className="mb-4 flex flex-wrap gap-2"><a href="/visitor-form" aria-current={!status ? "page" : undefined} className="inline-flex min-h-8 items-center rounded-full border px-3 text-xs">All</a>{statuses.map((value) => <a key={value} href={`/visitor-form?status=${value}`} aria-current={status === value ? "page" : undefined} className="inline-flex min-h-8 items-center rounded-full border px-3 text-xs">{humanize(value)}</a>)}</nav>
          {leads.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">No visitor leads yet.</p>
          ) : (
            <>
          <ul className="divide-y divide-line md:hidden">{leads.map((lead) => <li key={lead.id} className="space-y-2 py-4"><p className="font-medium">{lead.name}</p><div className="flex flex-wrap gap-3 text-sm"><a className="min-h-6" href={`tel:${lead.phone}`}>{lead.phone}</a>{lead.email && <a className="min-h-6" href={`mailto:${lead.email}`}>{lead.email}</a>}</div><p className="text-xs text-ink-muted">{[lead.courseOfInterest, lead.countryOfInterest].filter(Boolean).join(" · ") || "No interests recorded"}</p><div className="flex flex-wrap items-center justify-between gap-2"><VisitorLeadActions id={lead.id} status={lead.status} controlId={`lead-status-mobile-${lead.id}`} /><span className="text-xs text-ink-muted">Received {formatDate(lead.createdAt)}</span><DeleteButton endpoint={`/api/visitor-form/${lead.id}`} confirmText="Delete this lead?" label="Delete" /></div></li>)}</ul>
            <div className="hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label="Visitor leads table">
              <table className="w-full text-sm"><caption className="sr-only">Visitor leads and follow-up information</caption>
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                    <th scope="col" className="p-4">Name</th>
                    <th scope="col" className="p-4">Contact</th>
                    <th scope="col" className="p-4">Interests</th>
                    <th scope="col" className="p-4">Status</th>
                    <th scope="col" className="p-4">Received</th>
                    <th scope="col" className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line dark:divide-navy-700">
                  {leads.map((l) => (
                    <tr key={l.id}>
                      <td className="p-4 font-medium">{l.name}</td>
                      <td className="p-4 text-ink-muted"><a href={`tel:${l.phone}`} className="inline-flex min-h-6 items-center hover:underline">{l.phone}</a>{l.email && <div><a href={`mailto:${l.email}`} className="inline-flex min-h-6 items-center text-xs hover:underline">{l.email}</a></div>}</td>
                      <td className="p-4 text-ink-muted">
                        {[l.courseOfInterest, l.countryOfInterest].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="p-4"><VisitorLeadActions id={l.id} status={l.status} controlId={`lead-status-table-${l.id}`} /></td>
                      <td className="p-4 text-ink-muted">{formatDate(l.createdAt)}</td>
                      <td className="p-4 text-right">
                        <DeleteButton endpoint={`/api/visitor-form/${l.id}`} confirmText="Delete this lead?" label="Delete" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>
      {total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><p className="text-ink-muted">Showing {(requestedPage - 1) * PAGE_SIZE + 1}–{Math.min(requestedPage * PAGE_SIZE, total)} of {total} leads.</p>{pageCount > 1 && <nav aria-label="Visitor lead pages" className="flex gap-2">{requestedPage > 1 && <a className="inline-flex min-h-9 items-center rounded-lg border px-3" href={query(requestedPage - 1)}>Previous</a>}<span>Page {requestedPage} of {pageCount}</span>{requestedPage < pageCount && <a className="inline-flex min-h-9 items-center rounded-lg border px-3" href={query(requestedPage + 1)}>Next</a>}</nav>}</div>}
    </div>
  );
}
