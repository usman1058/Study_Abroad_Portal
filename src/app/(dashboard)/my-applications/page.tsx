import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { DraftSubmitButton } from "@/components/draft-submit-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, toNum } from "@/lib/utils";
import { APPLICATION_STAGES, APPLICATION_STAGE_ORDER } from "@/lib/constants";
import type { ApplicationStage, DocumentStatus } from "@/generated/prisma/client";

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

  const applications = await prisma.application.findMany({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      program: { include: { university: true } },
      documents: true,
    },
  });

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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Applications</h1>
          <p className="text-sm text-slate-500">Track your applications and their progress.</p>
        </div>
        <Link
          href="/apply"
          className="inline-flex h-10 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          + New application
        </Link>
      </div>

      {submitted && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">
          Application submitted. Your consultant will review it and verify your documents — track its progress in the tabs below.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Total applications</p><p className="mt-1 text-2xl font-bold">{total}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Offers received</p><p className="mt-1 text-2xl font-bold text-green-600">{offered}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">In progress</p><p className="mt-1 text-2xl font-bold text-brand-600">{inProgress}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Documents pending</p><p className="mt-1 text-2xl font-bold text-amber-600">{pendingDocs}</p></CardContent></Card>
      </div>

      {rows.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Applications by stage</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {APPLICATION_STAGE_ORDER.map((stage) => {
                const count = stageCounts.get(stage) ?? 0;
                const pct = count === 0 ? 0 : Math.max(6, Math.round((count / maxCount) * 100));
                return (
                  <div key={stage} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-600">{count}</span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-md bg-brand-500 transition-all dark:bg-brand-600"
                        style={{ height: `${pct}%` }}
                        title={`${count} application(s) ${stage.replace(/_/g, " ").toLowerCase()}`}
                      />
                    </div>
                    <span className="text-center text-[10px] leading-tight text-slate-500">
                      {APPLICATION_STAGES.find((s) => s.value === stage)?.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-slate-500">Combined tuition of active applications: {formatCurrency(totalFees)}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
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
              <Card key={a.id}>
                <CardContent className="p-5">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
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
