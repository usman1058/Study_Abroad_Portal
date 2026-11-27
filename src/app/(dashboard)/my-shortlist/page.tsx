import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { CompareCourses } from "@/components/compare-courses";
import { ShortlistRowActions } from "@/components/shortlist-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { ShortlistShareButton } from "@/components/shortlist-share-button";
import { FallbackLogo } from "@/components/fallback-logo";

export const metadata = { title: "My shortlist" };

const TAG_TONE: Record<string, "green" | "brand" | "amber" | "slate"> = {
  "High Placement Rate": "green",
  "Scholarship Available": "brand",
  "MOI Accepted": "amber",
  "Popular with Partners": "slate",
};

export default async function MyShortlistPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  if (user.role !== "STUDENT") redirect("/home");

  // Read-only: opening a page must not write to the database. Last-viewed
  // tracking is written by the explicit "share/export" actions instead.
  const shortlist = await prisma.shortlist.findUnique({
    where: { studentId: user.id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { program: { include: { university: true } } },
      },
    },
  });

  const items = shortlist?.items ?? [];
  // Sharing the authenticated /my-shortlist URL only ever shows the recipient a
  // login screen, so share the courses themselves instead.
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My shortlist</h1>
          <p className="text-sm text-ink-muted">
            Courses you are considering, in the order you ranked them.
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/shortlist/${user.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Download className="h-4 w-4" aria-hidden="true" /> Download shortlist PDF
            </a>
            <ShortlistShareButton items={items.map((item) => ({ university: item.program.university?.name ?? "Unknown university", name: item.program.name, tuitionMYR: Number(item.program.tuitionFee) }))} />
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm font-medium">Your shortlist is empty.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
              Add courses from the catalogue and they will appear here, ready to compare and export.
            </p>
            <Link
              href="/scholarships"
              className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              Browse the course catalogue
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Compare courses</CardTitle>
            </CardHeader>
            <CardContent>
              <CompareCourses
                items={items.map((it) => ({
                  id: it.programId,
                  name: it.program.name,
                  university: it.program.university?.name ?? "Unknown",
                  tuition: Number(it.program.tuitionFee),
                  applicationFee: it.program.applicationFee != null ? Number(it.program.applicationFee) : null,
                  durationMonths: it.program.courseDurationMonths,
                  intakeDates: it.program.intakeDates.map((d) => d.toISOString()),
                  minGpa: it.program.minGpa,
                  tags: it.program.tags,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your courses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Phones: stacked rows with the same actions, no sideways scroll. */}
              <ul className="divide-y divide-line md:hidden dark:divide-navy-700">
                {items.map((it, idx) => {
                  const p = it.program;
                  const university = p.university?.name ?? "Unknown";
                  return (
                    <li key={it.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-ink-muted">#{idx + 1}</p>
                          <Link href={`/programs/${p.id}`} className="inline-flex min-h-6 items-center font-medium hover:underline">
                            {university}
                          </Link>
                          <p className="text-sm">{p.name}</p>
                          <p className="text-xs text-ink-muted">{p.location ?? p.university?.country ?? "—"}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {p.tags.slice(0, 3).map((t) => (
                          <Badge key={t} tone={TAG_TONE[t] ?? "slate"}>{t}</Badge>
                        ))}
                        {p.tags.length > 3 && <Badge tone="slate">+{p.tags.length - 3}</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link
                          href={`/programs/${p.id}`}
                          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden="true" /> View details
                        </Link>
                        <ShortlistRowActions
                          programId={p.id}
                          label={`${university} — ${p.name}`}
                          index={idx}
                          count={items.length}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div
                role="region"
                tabIndex={0}
                aria-label="Your shortlisted courses, scrollable"
                className="hidden overflow-x-auto rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 md:block"
              >
                <table className="w-full text-sm">
                  <caption className="sr-only">Your shortlisted courses, in rank order</caption>
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase text-ink-muted dark:border-navy-700">
                      <th scope="col" className="p-4">#</th>
                      <th scope="col" className="p-4">University</th>
                      <th scope="col" className="p-4">Course / program</th>
                      <th scope="col" className="p-4">Location</th>
                      <th scope="col" className="p-4">Tags</th>
                      <th scope="col" className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line dark:divide-navy-700">
                    {items.map((it, idx) => {
                      const p = it.program;
                      const university = p.university?.name ?? "Unknown";
                      return (
                        <tr key={it.id} className="hover:bg-canvas dark:hover:bg-navy-800/40">
                          <td className="p-4 text-ink-muted">{idx + 1}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <FallbackLogo src={p.universityLogoUrl ?? p.university?.logoUrl} alt={`${university} logo`} className="h-9 w-9 shrink-0 rounded-lg border border-line bg-white object-contain p-1 dark:border-navy-700" />
                              <Link href={`/programs/${p.id}`} className="inline-flex min-h-6 items-center font-medium hover:underline">
                                {university}
                              </Link>
                            </div>
                          </td>
                          <td className="p-4">{p.name}</td>
                          <td className="p-4 text-ink-muted">{p.location ?? p.university?.country ?? "—"}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {p.tags.slice(0, 3).map((t) => (
                                <Badge key={t} tone={TAG_TONE[t] ?? "slate"}>{t}</Badge>
                              ))}
                              {p.tags.length > 3 && <Badge tone="slate">+{p.tags.length - 3}</Badge>}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <Link
                                href={`/programs/${p.id}`}
                                className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
                              >
                                <ExternalLink className="h-3 w-3" aria-hidden="true" /> View details
                              </Link>
                              <ShortlistRowActions
                                programId={p.id}
                                label={`${university} — ${p.name}`}
                                index={idx}
                                count={items.length}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {shortlist && (
            <p className="text-xs text-ink-muted">
              Last updated {formatDate(shortlist.updatedAt)} · {items.length} course{items.length === 1 ? "" : "s"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
