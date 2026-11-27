import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { Download, ExternalLink, MessageCircle } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getProgramBySlug, profileCompleteness } from "@/lib/queries";
import { ShortlistToggle } from "@/components/shortlist-toggle";
import { CurrencySwitcher, FeeDisplay } from "@/components/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, toNum } from "@/lib/utils";
import { programLevelLabel } from "@/lib/constants";
import { ApplyButton } from "@/components/apply-button";
import { FallbackLogo } from "@/components/fallback-logo";

export const metadata = { title: "Program details" };

async function requestOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

type PageProps = { params: Promise<{ id: string }> };

export default async function ProgramDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");

  const program = await getProgramBySlug(id);
  // An unknown id is a real 404 rather than a 200 card, so the status matches
  // the answer and crawlers/links do not treat a dead program as a page.
  if (!program) notFound();

  const profileReady = user.role === "STUDENT" ? await prisma.user.findUnique({
    where: { id: user.id },
    select: { phone: true, country: true, gender: true, birthday: true, passportNumber: true, countryOfResidence: true, nationality: true, cityOfResidence: true, address: true, motherName: true, fatherName: true },
  }).then((profile) => Boolean(profile && profileCompleteness(profile as unknown as Parameters<typeof profileCompleteness>[0]) >= 80)) : false;

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

  const rawWhy: unknown = program.whyHighlights;
  const why = Array.isArray(rawWhy) ? rawWhy.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const item = entry as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (!title && !description) return [];
    return [{ icon: typeof item.icon === "string" ? item.icon : "", title, description }];
  }) : [];
  const tags = program.tags.map((tag) => tag.trim()).filter(Boolean);
  const criteria = program.eligibilityCriteria.map((item) => item.trim()).filter(Boolean);
  const requiredDocuments = program.requiredDocuments.map((item) => item.trim()).filter(Boolean);

  const details: { label: string; value: React.ReactNode }[] = [];
  if (program.applicationFee != null) details.push({ label: "Application Fee", value: <FeeDisplay amount={toNum(program.applicationFee)} /> });
  details.push({ label: "Tuition Fee", value: <FeeDisplay amount={toNum(program.tuitionFee)} /> });
  details.push({ label: "Visa Required", value: program.visaRequired ? "Yes" : "No" });
  if (program.offerTurnaroundDays != null) details.push({ label: "Offer Turnaround Time", value: `${program.offerTurnaroundDays} days` });
  if (program.courseDurationMonths != null) details.push({ label: "Course Duration", value: `${program.courseDurationMonths} months` });
  if (program.intakeDates.length > 0) details.push({ label: "Open Intakes", value: program.intakeDates.map((d) => formatDate(d, { dateStyle: "medium" })).join(", ") });
  if (program.collegeRank) details.push({ label: "College Rank", value: program.collegeRank });
  if (program.minGpa != null) details.push({ label: "Minimum GPA", value: `${program.minGpa}%` });
  if (user.role === "SUPER_ADMIN" || user.role === "MANAGER") details.push({ label: "Partner commission", value: `${toNum(program.commissionRate)}%` });

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
  const scholarshipOffers = await prisma.scholarshipProgram.findMany({ where: { programId: program.id, scholarship: { isActive: true } }, include: { scholarship: { select: { slug: true, name: true, awardType: true, awardValue: true, awardCurrency: true, deadline: true } } }, orderBy: { scholarship: { name: "asc" } } });

  const shareUrl = `${await requestOrigin()}/programs/${program.id}`;

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-8">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted"><Link href="/programs" className="rounded-sm hover:text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">Programs</Link><span aria-hidden="true" className="px-2">/</span><span aria-current="page" className="font-medium text-ink dark:text-slate-100">{program.name}</span></nav>
      <Card className="detail-panel border-indigo-200 bg-gradient-to-br from-indigo-100/75 via-blue-50/80 to-violet-100/70 dark:border-indigo-800/70 dark:from-indigo-950/55 dark:via-navy-900 dark:to-violet-950/45">
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
              <FallbackLogo src={program.universityLogoUrl ?? program.university?.logoUrl} alt={`${program.university?.name ?? "University"} logo`} className="h-16 w-16 shrink-0 rounded-xl border border-line bg-white object-contain p-2 shadow-sm dark:border-navy-700 sm:h-20 sm:w-20" />
              <div className="min-w-0">
                <p className="text-base font-semibold text-brand-700 dark:text-brand-300">{program.university?.name ?? "Unknown university"}</p>
                {/* The program is the subject of the page, so its name is the heading. */}
                <h1 className="mt-1 break-words text-3xl font-bold tracking-tight sm:text-4xl">{program.name}</h1>
                <p className="mt-2 text-base leading-7 text-ink-muted sm:text-lg">
                  {[programLevelLabel(program.level), program.field, program.location ?? program.university?.country]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {program.university?.website && (
                  <a
                    href={program.university.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg text-base font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-300"
                  >
                    Go to university page <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2 lg:max-w-sm lg:justify-end">
              {user.role === "STUDENT" && (
                <>
                  <ShortlistToggle programId={program.id} initial={shortlisted} />
                  <ApplyButton programId={program.id} profileReady={profileReady} programName={program.name} />
                  <CurrencySwitcher />
                </>
              )}
              <Link href="/programs" className="inline-flex min-h-11 items-center rounded-lg border border-line-strong px-4 py-2 text-sm font-semibold hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-navy-700 dark:hover:bg-navy-800">Back to programs</Link>
              <a
                href={`/api/programs/${program.id}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
              >
                <Download className="h-4 w-4" /> Download Details PDF
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Check out ${program.name} at ${program.university?.name} — ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {tags.length > 0 && <section aria-label="Program highlights" className="flex flex-wrap gap-2">{tags.map((t) => <Badge key={t} tone={t === "High Placement Rate" ? "green" : t === "Scholarship Available" ? "brand" : t === "MOI Accepted" ? "amber" : "slate"}>{t}</Badge>)}</section>}

      {why.length > 0 && <Card className="detail-panel border-indigo-200 bg-gradient-to-br from-indigo-100/75 via-white/90 to-violet-100/70 dark:border-indigo-800/70 dark:from-indigo-950/55 dark:via-navy-900 dark:to-violet-950/45">
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl">Why {program.university?.name ?? "this university"}?</CardTitle>
        </CardHeader>
        <CardContent>
          {why.length === 0 ? (
            <p className="text-sm text-ink-muted">No highlights available.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {why.map((h, i) => (
                <div key={i} className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-100/80 to-violet-100/65 p-4 dark:border-indigo-900/60 dark:from-indigo-950/60 dark:to-violet-950/40">
                  <div aria-hidden="true" className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-lg text-brand-600 dark:bg-brand-900/40 dark:text-brand-200">
                    {h.icon || "✨"}
                  </div>
                  {h.title && <p className="text-base font-semibold">{h.title}</p>}
                  {h.description && <p className="mt-1 text-base leading-7 text-ink-muted">{h.description}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="detail-panel border-indigo-200 bg-gradient-to-br from-indigo-100/75 via-blue-50/80 to-violet-100/70 dark:border-indigo-800/70 dark:from-indigo-950/55 dark:via-navy-900 dark:to-violet-950/45">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Course details</CardTitle>
          </CardHeader>
          <CardContent>
            {details.length === 0 ? (
              <p className="text-sm text-ink-muted">No course details available.</p>
            ) : (
              <dl className="grid gap-3 sm:grid-cols-2">
                {details.map((d) => (
                  <div key={d.label} className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-100/80 to-violet-100/65 p-4 dark:border-indigo-900/60 dark:from-indigo-950/60 dark:to-violet-950/40">
                    <dt className="text-sm font-medium text-ink-muted">{d.label}</dt>
                    <dd className="mt-1 text-base font-semibold leading-7 text-ink dark:text-slate-100">{d.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>

        {(criteria.length > 0 || requiredDocuments.length > 0) && <Card className="detail-panel border-violet-200 bg-gradient-to-br from-violet-100/75 via-indigo-50/80 to-blue-100/70 dark:border-violet-800/70 dark:from-violet-950/50 dark:via-navy-900 dark:to-indigo-950/45">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Admission requirements</CardTitle>
          </CardHeader>
          <CardContent>
            {criteria.length > 0 && <><p className="mb-3 text-base text-ink-muted">{program.university?.name ?? "The university"} requires:</p><ul className="list-disc space-y-2.5 pl-6 text-base leading-7 marker:text-brand-600">
                {criteria.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul></>}
            {requiredDocuments.length > 0 && (
              <>
                <h3 className="mb-3 mt-6 text-lg font-semibold">Required documents</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {requiredDocuments.map((d) => <li key={d} className="flex min-h-12 items-center gap-2 rounded-lg border border-violet-200 bg-gradient-to-r from-violet-100/80 to-indigo-100/65 px-3 py-2 text-base font-medium leading-6 dark:border-violet-900/60 dark:from-violet-950/50 dark:to-indigo-950/40"><span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />{d}</li>)}
                </ul>
              </>
            )}
          </CardContent>
        </Card>}
      </div>

      {scholarshipOffers.length > 0 && <section aria-labelledby="program-scholarships-heading" className="space-y-3"><div><h2 id="program-scholarships-heading" className="text-2xl font-bold">Scholarships for this program</h2><p className="mt-1 text-sm text-ink-muted">Funding opportunities linked to this specific course.</p></div><ul className="grid gap-3 sm:grid-cols-2">{scholarshipOffers.map(({ scholarship }) => <li key={scholarship.slug}><Link href={`/scholarships/${scholarship.slug}`} className="block rounded-xl border border-line p-5 transition hover:border-brand-400 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-navy-700 dark:hover:bg-navy-800"><p className="text-base font-semibold">{scholarship.name}</p><p className="mt-2 text-sm text-ink-muted">{scholarship.awardType === "PERCENTAGE" && scholarship.awardValue != null ? `${scholarship.awardValue.toString()}% tuition award` : scholarship.awardType === "FIXED_AMOUNT" && scholarship.awardValue != null ? `${scholarship.awardCurrency} ${scholarship.awardValue.toString()}` : scholarship.awardType === "FULL_TUITION" ? "Full tuition" : "Scholarship award"}</p>{scholarship.deadline && <p className="mt-2 text-sm text-ink-muted">Deadline {formatDate(scholarship.deadline)}</p>}</Link></li>)}</ul></section>}

      {similar.length > 0 && (
        <Card className="detail-panel border-indigo-200 bg-gradient-to-br from-indigo-100/75 via-white/90 to-violet-100/70 dark:border-indigo-800/70 dark:from-indigo-950/55 dark:via-navy-900 dark:to-violet-950/45">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">Similar courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {similar.map((s) => <Link key={s.id} href={`/programs/${s.id}`} className="detail-panel flex min-h-36 items-start gap-4 rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-100/80 to-violet-100/65 p-5 transition hover:border-brand-400 hover:from-indigo-100 hover:to-violet-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-indigo-900/60 dark:from-indigo-950/55 dark:to-violet-950/40 dark:hover:from-indigo-950/70 dark:hover:to-violet-950/60">
                <FallbackLogo src={s.university.logoUrl} alt={`${s.university.name} logo`} className="h-12 w-12 shrink-0 rounded-lg border border-line bg-white object-contain p-1 dark:border-navy-700" />
                <span className="min-w-0"><span className="block text-base font-semibold">{s.university.name}</span><span className="mt-1 block text-base leading-6">{s.name}</span><span className="mt-3 block text-base font-semibold"><FeeDisplay amount={toNum(s.tuitionFee)} /></span></span>
              </Link>)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
