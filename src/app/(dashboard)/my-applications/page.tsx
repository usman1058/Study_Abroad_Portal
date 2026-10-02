import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DraftSubmitButton } from "@/components/draft-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, humanize, toNum } from "@/lib/utils";
import { APPLICATION_STAGES, APPLICATION_STAGE_ORDER } from "@/lib/constants";
import type { ApplicationStage, DocumentStatus } from "@/generated/prisma/client";
import { ArrowRight, BarChart3, ClipboardList, FileCheck2, GraduationCap, Sparkles, TrendingUp } from "lucide-react";
import { DashboardAdRail } from "@/components/dashboard-ad-rail";

export const metadata = { title: "My Applications" };

const STAGE_TONE: Record<ApplicationStage, "red" | "green" | "brand" | "amber" | "slate"> = {
  DRAFT: "slate",
  SUBMITTED: "amber",
  UNDER_REVIEW: "brand",
  OFFER: "green",
  DEPOSIT_PAID: "green",
  VISA: "brand",
  ENROLLED: "green",
  REJECTED: "red",
  WITHDRAWN: "slate",
};

type TabKey = "all" | "drafts" | "waiting" | "missing-docs" | "offer" | "visa-enrolled" | "rejected";

const TABS: { key: TabKey; label: string; match: (a: { stage: ApplicationStage; docsOk: boolean }) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "drafts", label: "Drafts", match: (a) => a.stage === "DRAFT" },
  { key: "waiting", label: "Waiting for Approval", match: (a) => a.stage === "SUBMITTED" || a.stage === "UNDER_REVIEW" },
  { key: "missing-docs", label: "Missing Documents", match: (a) => a.docsOk === false },
  { key: "offer", label: "Offer Letter Received", match: (a) => a.stage === "OFFER" || a.stage === "DEPOSIT_PAID" },
  { key: "visa-enrolled", label: "Visa & Enrolled", match: (a) => a.stage === "VISA" || a.stage === "ENROLLED" },
  { key: "rejected", label: "Rejected", match: (a) => a.stage === "REJECTED" || a.stage === "WITHDRAWN" },
];

type SearchParams = Promise<{ tab?: string; submitted?: string }>;

export default async function MyApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/home");

  const { tab = "all", submitted } = await searchParams;
  const now = new Date();

  const [applications, courseEnrollments, availableCourses, advertisements] = await Promise.all([
    prisma.application.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      include: { program: { include: { university: true } }, documents: true },
    }),
    prisma.shortCourseEnrollment.findMany({
      where: { studentId: user.id, status: { notIn: ["withdrawn", "rejected"] } },
      orderBy: { enrolledAt: "desc" },
      take: 4,
      include: { shortCourse: { select: { id: true, title: true, provider: true, category: true, duration: true, deliveryMode: true } } },
    }),
    prisma.shortCourse.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 4,
      select: { id: true, title: true, provider: true, category: true, duration: true, deliveryMode: true },
    }),
    prisma.dashboardAdvertisement.findMany({
      where: { active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }] },
      select: { id: true, title: true, body: true, imageUrl: true, linkUrl: true, ctaLabel: true, active: true, sortOrder: true, startsAt: true, endsAt: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  type Row = (typeof applications)[number] & { docsOk: boolean };
  const rows: Row[] = applications.map((a) => ({
    ...a,
    docsOk: a.documents.length > 0 && a.documents.every((d) => d.status === ("VERIFIED" as DocumentStatus)),
  }));

  const activeTab = (TABS.find((t) => t.key === tab)?.key ?? "all") as TabKey;
  const visible = rows.filter((r) => TABS.find((t) => t.key === activeTab)!.match({ stage: r.stage, docsOk: r.docsOk }));

  const total = rows.length;
  const offered = rows.filter((a) => ["OFFER", "DEPOSIT_PAID"].includes(a.stage)).length;
  const inProgress = rows.filter((a) => ["SUBMITTED", "UNDER_REVIEW", "VISA"].includes(a.stage)).length;
  const pendingDocs = rows.reduce((s, a) => s + a.documents.filter((d) => d.status !== "VERIFIED").length, 0);

  const stageCounts = new Map<ApplicationStage, number>();
  for (const s of APPLICATION_STAGE_ORDER) stageCounts.set(s, 0);
  for (const a of rows) stageCounts.set(a.stage, (stageCounts.get(a.stage) ?? 0) + 1);
  const maxCount = Math.max(1, ...stageCounts.values());
  const totalFees = rows.reduce((s, a) => s + toNum(a.program.tuitionFee), 0);
  const draftCount = rows.filter((r) => r.stage === "DRAFT").length;
  const monthlyActivity = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (4 - index), 1);
    return { label: start.toLocaleString("en", { month: "short" }), value: rows.filter((application) => application.createdAt >= start && application.createdAt < end).length };
  });

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-cyan-600 px-5 py-6 text-white shadow-lg shadow-brand-900/10 sm:px-7 sm:py-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="flex items-center gap-2 text-sm font-semibold text-brand-100"><Sparkles className="h-4 w-4" /> Student workspace</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Your study journey, in one place.</h1><p className="mt-2 max-w-xl text-sm leading-6 text-brand-50">Track applications, find your next course, and keep every required step moving forward.</p></div>
          <div className="flex flex-wrap gap-2"><Link href="/apply" className="inline-flex h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"><ClipboardList className="h-4 w-4" /> New application</Link><Link href="/programs" className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 text-sm font-semibold transition hover:bg-white/20"><GraduationCap className="h-4 w-4" /> Explore programs</Link></div>
        </div>
      </section>

      <section aria-label="Student dashboard updates" className="grid gap-5 xl:grid-cols-2">
        <DashboardAdRail ads={advertisements} variant="rail" />
        <Card className="overflow-hidden"><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle>Keep your journey moving</CardTitle><p className="mt-1 text-sm text-slate-500">Three quick checks to stay on track.</p></div><span className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200"><GraduationCap className="h-5 w-5" /></span></CardHeader><CardContent className="grid gap-2 sm:grid-cols-3 xl:grid-cols-1">{[{ href: "/documents", title: "Check documents", detail: pendingDocs ? `${pendingDocs} document${pendingDocs === 1 ? "" : "s"} need attention` : "All documents are up to date", icon: FileCheck2 }, { href: "/short-courses", title: "Explore courses", detail: courseEnrollments.length ? `${courseEnrollments.length} course${courseEnrollments.length === 1 ? "" : "s"} in your list` : "Find a course to start", icon: GraduationCap }, { href: "/programs", title: "Find a program", detail: "Compare universities and options", icon: ClipboardList }].map((item) => <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/15"><span className="rounded-lg bg-slate-100 p-2 text-slate-600 group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-brand-900/40 dark:group-hover:text-brand-200"><item.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="block truncate text-xs text-slate-500">{item.detail}</span></span><ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-brand-600" /></Link>)}</CardContent></Card>
      </section>

      {submitted && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
          Application submitted. Your consultant will review it and verify your documents — track its progress in the tabs below.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StudentMetric label="Total applications" value={total} hint="Your complete portfolio" icon={ClipboardList} tone="brand" />
        <StudentMetric label="Offers received" value={offered} hint="Great news worth reviewing" icon={GraduationCap} tone="green" />
        <StudentMetric label="In progress" value={inProgress} hint="Currently being processed" icon={ArrowRight} tone="cyan" />
        <StudentMetric label="Documents pending" value={pendingDocs} hint="Complete these to avoid delays" icon={FileCheck2} tone="amber" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3"><div><CardTitle>My course list</CardTitle><p className="mt-1 text-sm text-slate-500">Your current learning, or active courses ready to join.</p></div><Link href="/short-courses" className="shrink-0 text-sm font-semibold text-brand-600 hover:underline">Browse courses</Link></CardHeader>
        <CardContent>{courseEnrollments.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{courseEnrollments.map((enrollment) => <Link key={enrollment.id} href={`/short-courses/${enrollment.shortCourse.id}`} className="group rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/15"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-200">{enrollment.shortCourse.title}</p><p className="mt-1 truncate text-xs text-slate-500">{enrollment.shortCourse.provider}</p></div><Badge tone={enrollment.status === "completed" ? "green" : enrollment.status === "enrolled" ? "brand" : "amber"}>{humanize(enrollment.status)}</Badge></div><p className="mt-3 text-xs text-slate-500">{enrollment.shortCourse.duration} · {humanize(enrollment.shortCourse.deliveryMode)}</p></Link>)}</div> : availableCourses.length > 0 ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{availableCourses.map((course) => <Link key={course.id} href={`/short-courses/${course.id}`} className="group rounded-xl border border-slate-200 p-4 transition hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-900/15"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-sm font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-200">{course.title}</p><p className="mt-1 truncate text-xs text-slate-500">{course.provider}</p></div><Badge tone="brand">Available</Badge></div><p className="mt-3 text-xs text-slate-500">{course.duration} · {humanize(course.deliveryMode)}</p></Link>)}</div> : <div className="rounded-xl border border-dashed border-slate-300 px-4 py-7 text-center text-sm text-slate-500 dark:border-slate-700">No active short courses are available yet.</div>}</CardContent>
      </Card>

      <section aria-label="Application analytics" className="grid gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden"><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle>Application activity</CardTitle><p className="mt-1 text-sm text-slate-500">Applications started over the last six months.</p></div><span className="rounded-xl bg-brand-50 p-2.5 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200"><TrendingUp className="h-5 w-5" /></span></CardHeader><CardContent><MonthlyActivityChart points={monthlyActivity} /></CardContent></Card>
        <Card className="overflow-hidden"><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle>Application progress</CardTitle><p className="mt-1 text-sm text-slate-500">A clear breakdown of where your portfolio stands.</p></div><span className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200"><BarChart3 className="h-5 w-5" /></span></CardHeader><CardContent><StageDistributionChart counts={stageCounts} max={maxCount} /><p className="mt-5 text-xs text-slate-500">Combined tuition of active applications: {formatCurrency(totalFees)}</p></CardContent></Card>
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">My applications</h2><p className="text-sm text-slate-500">Choose a view to focus on what needs attention.</p></div><Link href="/apply" className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">Start another application <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
          {TABS.map((t) => {
            const count = rows.filter((r) => t.match({ stage: r.stage, docsOk: r.docsOk })).length;
            return (
              <Link
                key={t.key}
                href={`/my-applications?tab=${t.key}`}
                className={
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition " +
                  (activeTab === t.key
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800")
                }
              >
                {t.label} <span className="ml-1 text-xs opacity-70">({count})</span>
              </Link>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No applications in this view.
              {(activeTab === "all" || activeTab === "drafts") && (
                <> Use <Link href="/apply" className="font-medium text-brand-600 hover:underline">Apply Application</Link> to start one.</>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {visible.map((a) => (
              <Card key={a.id} className="transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md">
<CardContent className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div>
                        {a.program.universityLogoUrl && (
                          <img
                            src={a.program.universityLogoUrl}
                            alt={`${a.program.university.name} logo`}
                            className="h-8 w-8 shrink-0 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 mr-2"
                          />
                        )}
                        <p className="font-semibold">{a.program.name}</p>
                        <p className="text-xs text-slate-500">{a.program.university.name}</p>
                      </div>
                    <Badge tone={STAGE_TONE[a.stage]}>{a.stage.replace(/_/g, " ")}</Badge>
                  </div>
                  {!a.docsOk && a.stage !== "WITHDRAWN" && (
                    <p className="mb-2 text-xs text-amber-600">⚠ Missing or unverified documents — upload them so processing isn&apos;t blocked.</p>
                  )}
                  {a.stage === "DRAFT" && (
                    <p className="mb-2 text-xs text-slate-500">Draft — edit or submit it when ready.</p>
                  )}
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Tuition</dt>
                      <dd>{formatCurrency(toNum(a.program.tuitionFee))}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Submitted</dt>
                      <dd>{a.submittedAt ? formatDate(a.submittedAt) : "—"}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Documents</dt>
                      <dd>{a.documents.filter((d) => d.status === "VERIFIED").length}/{a.documents.length} verified</dd>
                    </div>
                  </dl>
                  {a.stage === "DRAFT" && (
                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        href={`/apply?draft=${a.id}`}
                        className="inline-flex h-8 items-center rounded-lg border border-slate-300 px-3 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Edit draft
                      </Link>
                      <DraftSubmitButton applicationId={a.id} />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {draftCount > 0 && activeTab !== "drafts" && (
          <p className="text-xs text-slate-500">
            You have {draftCount} draft{draftCount > 1 ? "s" : ""} waiting in the Drafts tab.
          </p>
        )}
      </div>
    </div>
  );
}

function StudentMetric({ label, value, hint, icon: Icon, tone }: { label: string; value: number; hint: string; icon: typeof ClipboardList; tone: "brand" | "green" | "cyan" | "amber" }) {
  const colors = { brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200", green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200", cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200", amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200" };
  return <Card className="transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"><CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5"><div><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-xs text-slate-400">{hint}</p></div><span className={`rounded-xl p-2.5 ${colors[tone]}`}><Icon className="h-5 w-5" /></span></CardContent></Card>;
}

function MonthlyActivityChart({ points }: { points: { label: string; value: number }[] }) {
  const max = Math.max(1, ...points.map((point) => point.value));
  return <div role="img" aria-label="Monthly application activity chart"><div className="flex h-56 items-end gap-3 border-b border-slate-200 pb-8 dark:border-slate-700">{points.map((point) => <div key={point.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">{point.value}</span><div className="flex h-[calc(100%-3rem)] w-full items-end rounded-t-lg bg-slate-100 px-1 dark:bg-slate-800"><div className="w-full rounded-t-md bg-gradient-to-t from-brand-700 to-cyan-400 transition-all" style={{ height: point.value ? `${Math.max(8, Math.round((point.value / max) * 100))}%` : "3px" }} title={`${point.label}: ${point.value} application${point.value === 1 ? "" : "s"}`} /></div><span className="text-xs font-medium text-slate-500">{point.label}</span></div>)}</div><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>Monthly application starts</span><span>{max} monthly peak</span></div></div>;
}

function StageDistributionChart({ counts, max }: { counts: Map<ApplicationStage, number>; max: number }) {
  return <div role="img" aria-label="Application stages distribution chart" className="space-y-3">{APPLICATION_STAGE_ORDER.map((stage) => {
    const count = counts.get(stage) ?? 0;
    const label = APPLICATION_STAGES.find((item) => item.value === stage)?.label ?? stage.replace(/_/g, " ");
    return <div key={stage}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-medium text-slate-600 dark:text-slate-300">{label}</span><span className="font-bold text-slate-700 dark:text-slate-200">{count}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-brand-600 transition-all" style={{ width: count ? `${Math.max(7, Math.round((count / max) * 100))}%` : "0%" }} /></div></div>; })}</div>;
}
