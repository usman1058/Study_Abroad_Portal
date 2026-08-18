import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { APPLICATION_STAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StageFilter } from "@/components/stage-filter";
import { formatDate } from "@/lib/utils";
import type { ApplicationStage } from "@/generated/prisma/client";

export const metadata = { title: "Applications" };

type SearchParams = Promise<{ stage?: string }>;

const STAGE_TONE: Record<string, "green" | "brand" | "amber" | "red" | "slate"> = {
  ENROLLED: "green",
  OFFER: "green",
  VISA: "brand",
  REJECTED: "red",
  WITHDRAWN: "red",
};

export default async function ApplicationsPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const { stage = "" } = await searchParams;

  const where = {
    ...(stage ? { stage: stage as ApplicationStage } : {}),
    ...(user.role === "COUNSELOR"
      ? { student: { assignedCounselorId: user.id } }
      : user.role === "AGENCY"
        ? { student: { createdById: user.id } }
        : {}),
  };

  const applications = await prisma.application.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, email: true } },
      program: { select: { name: true, visaRequired: true, university: { select: { name: true } } } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Applications</h1>
          <p className="text-sm text-slate-500">Manage the application pipeline.</p>
        </div>
        <StageFilter current={stage} />
      </div>

      <Card>
        <CardContent className="p-0">
          {applications.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">No applications found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-4">Student</th>
                    <th className="p-4">Program</th>
                    <th className="p-4">University</th>
                    <th className="p-4">Stage</th>
                    <th className="p-4">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {applications.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-4">
                        <Link href={`/users/${a.student.id}`} className="font-medium hover:underline">
                          {a.student.firstName} {a.student.lastName}
                        </Link>
                      </td>
                      <td className="p-4">
                        <Link href={`/application/${a.id}`} className="hover:underline">{a.program.name}</Link>
                      </td>
                      <td className="p-4 text-slate-500">{a.program.university.name}</td>
                      <td className="p-4">
                        <Badge tone={STAGE_TONE[a.stage] ?? "slate"}>{a.stage.replace(/_/g, " ")}</Badge>
                      </td>
                      <td className="p-4 text-slate-500">{formatDate(a.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}