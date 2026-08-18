import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listPrograms } from "@/lib/queries";
import { ApplyForm } from "@/components/apply-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, toNum } from "@/lib/utils";
import { APPLICATION_STAGES, APPLICATION_STAGE_ORDER } from "@/lib/constants";
import type { ApplicationStage } from "@/generated/prisma/client";

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

export default async function MyApplicationsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  if (user.role !== "STUDENT") redirect("/home");

  const [applications, programs] = await Promise.all([
    prisma.application.findMany({
      where: { studentId: user.id },
      orderBy: { createdAt: "desc" },
      include: { program: { include: { university: true } }, documents: true },
    }),
    listPrograms(),
  ]);

  const total = applications.length;
  const offered = applications.filter((a) => ["OFFER", "DEPOSIT_PAID", "VISA", "ENROLLED"].includes(a.stage)).length;
  const inProgress = applications.filter((a) => ["SUBMITTED", "UNDER_REVIEW", "VISA"].includes(a.stage)).length;
  const pendingDocs = applications.reduce((s, a) => s + a.documents.filter((d) => d.status !== "VERIFIED").length, 0);

  const stageCounts = new Map<ApplicationStage, number>();
  for (const s of APPLICATION_STAGE_ORDER) stageCounts.set(s, 0);
  for (const a of applications) stageCounts.set(a.stage, (stageCounts.get(a.stage) ?? 0) + 1);
  const maxCount = Math.max(1, ...stageCounts.values());

  const totalFees = applications.reduce((s, a) => s + toNum(a.program.tuitionFee), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Applications</h1>
        <p className="text-sm text-slate-500">Track the programs you've applied to.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Total applications</p>
            <p className="mt-1 text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Offers received</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{offered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">In progress</p>
            <p className="mt-1 text-2xl font-bold text-brand-600">{inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">Documents pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingDocs}</p>
          </CardContent>
        </Card>
      </div>

      {applications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Applications by stage</CardTitle>
          </CardHeader>
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

      <Card>
        <CardHeader>
          <CardTitle>New application</CardTitle>
        </CardHeader>
        <CardContent>
          <ApplyForm
            programs={programs.map((p) => ({ id: p.id, label: `${p.university?.name ?? ""} — ${p.name}` }))}
          />
        </CardContent>
      </Card>

      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            You haven't started any applications yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {applications.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.program.name}</p>
                    <p className="text-xs text-slate-500">{a.program.university.name}</p>
                  </div>
                  <Badge tone={STAGE_TONE[a.stage]}>
                    {a.stage.replace(/_/g, " ")}
                  </Badge>
                </div>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}