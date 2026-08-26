import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ExternalLink, MessageCircle } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getProgramBySlug, serializeProgram } from "@/lib/queries";
import { ShortlistToggle } from "@/components/shortlist-toggle";
import { CurrencySwitcher, FeeDisplay } from "@/components/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, toNum } from "@/lib/utils";

export const metadata = { title: "Course Details" };

type PageProps = { params: Promise<{ id: string }> };

export default async function ProgramDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const program = await getProgramBySlug(id);
  if (!program) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">Program not found.</CardContent>
      </Card>
    );
  }

  // Last-viewed tracking, §6
  let shortlisted = false;
  if (user.role === "STUDENT") {
    prisma.programView.create({ data: { programId: program.id, studentId: user.id } }).catch(() => {});

    // Hydrate the shortlist toggle with its real state so an already-shortlisted
    // course shows "Shortlisted" and can be removed from this page.
    const shortlist = await prisma.shortlist.findUnique({
      where: { studentId: user.id },
      select: { id: true },
    });
    if (shortlist) {
      const item = await prisma.shortlistItem.findUnique({
        where: { shortlistId_programId: { shortlistId: shortlist.id, programId: program.id } },
        select: { id: true },
      });
      shortlisted = Boolean(item);
    }
  }

  const why = (program.whyHighlights as { icon?: string; title?: string; description?: string }[]) ?? [];

  const details: { label: string; value: React.ReactNode }[] = [];
  if (program.applicationFee != null) details.push({ label: "Application Fee", value: formatCurrency(program.applicationFee) });
  details.push({ label: "Tuition Fee", value: formatCurrency(program.tuitionFee) });
  if (program.offerTurnaroundDays != null) details.push({ label: "Offer Turnaround Time", value: `${program.offerTurnaroundDays} days` });
  if (program.courseDurationMonths != null) details.push({ label: "Course Duration", value: `${program.courseDurationMonths} months` });
  if (program.intakeDates.length > 0) details.push({ label: "Open Intakes", value: program.intakeDates.map((d) => formatDate(d, { dateStyle: "medium" })).join(", ") });
  if (program.collegeRank) details.push({ label: "College Rank", value: program.collegeRank });
  if (program.minGpa != null) details.push({ label: "Minimum GPA", value: String(program.minGpa) });

  // Similar course suggestions, §6
  const similar = await prisma.program.findMany({
    where: {
      id: { not: program.id },
      field: program.field,
      OR: [{ level: program.level }, { universityId: program.university?.id }],
    },
    include: { university: true },
    take: 3,
  });

  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/scholarships/${program.slug ?? program.id}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                {program.university?.name?.[0] ?? "?"}
              </span>
              <div>
                <p className="text-sm text-slate-500">{program.university?.name ?? "Unknown university"}</p>
                <h1 className="text-2xl font-bold">{program.name}</h1>
                <p className="text-sm text-slate-500">
                  {program.location ?? program.university?.country ?? ""}
                </p>
                {program.university?.website && (
                  <a
                    href={program.university.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                  >
                    Go to university page <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user.role === "STUDENT" && (
                <>
                  <ShortlistToggle programId={program.id} initial={shortlisted} />
                  <CurrencySwitcher />
                </>
              )}
              <a
                href={`/api/programs/${program.id}/pdf`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                <Download className="h-4 w-4" /> Download Details PDF
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out ${program.name} at ${program.university?.name} — ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {program.tags.map((t) => (
          <Badge key={t} tone={t === "High Placement Rate" ? "green" : t === "Scholarship Available" ? "brand" : t === "MOI Accepted" ? "amber" : "slate"}>
            {t}
          </Badge>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Why {program.university?.name ?? "this university"}?</CardTitle>
        </CardHeader>
        <CardContent>
          {why.length === 0 ? (
            <p className="text-sm text-slate-500">No highlights available.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {why.map((h, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-lg text-brand-600 dark:bg-brand-900/40 dark:text-brand-200">
                    {h.icon ?? "✨"}
                  </div>
                  <p className="font-semibold">{h.title ?? "Highlight"}</p>
                  <p className="mt-1 text-sm text-slate-500">{h.description ?? ""}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Course Details</CardTitle>
          </CardHeader>
          <CardContent>
            {details.length === 0 ? (
              <p className="text-sm text-slate-500">No course details available.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-4">
                {details.map((d) => (
                  <div key={d.label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                    <dt className="text-xs text-slate-500">{d.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium">{d.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eligibility Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-slate-500">
              {program.university?.name ?? "The university"} requires:
            </p>
            {program.eligibilityCriteria.length === 0 ? (
              <p className="text-sm text-slate-500">No specific criteria listed.</p>
            ) : (
              <ul className="list-disc space-y-1.5 pl-5 text-sm">
                {program.eligibilityCriteria.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
            {program.requiredDocuments.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-sm font-medium">Required documents</p>
                <div className="flex flex-wrap gap-1.5">
                  {program.requiredDocuments.map((d) => (
                    <Badge key={d} tone="slate">{d}</Badge>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {similar.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Similar courses you may like</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => {
                const card = serializeProgram(s);
                return (
                  <Link key={s.id} href={`/scholarships/${s.slug ?? s.id}`} className="rounded-xl border border-slate-200 p-4 transition hover:border-brand-400 dark:border-slate-800">
                    <p className="text-sm font-semibold">{s.university.name}</p>
                    <p className="truncate text-xs text-slate-500">{s.name}</p>
                    <p className="mt-2 text-sm font-medium">
                      <FeeDisplay amount={toNum(s.tuitionFee)} />
                    </p>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}