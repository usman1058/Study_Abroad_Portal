import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AgencyPermissionToggle } from "@/components/agency-permission-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, fullName } from "@/lib/utils";

export const metadata = { title: "Sub Agencies" };

export default async function SubAgenciesPage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT" || user.role === "COUNSELOR") redirect("/");

  const subAgencies =
    user.role === "AGENCY"
      ? await prisma.user.findMany({
          where: { role: "AGENCY", parentAgencyId: user.id },
          include: { parentAgency: true, agencyPermissionsReceived: true, agencyPermissionsGiven: true },
          orderBy: { createdAt: "desc" },
        })
      : await prisma.user.findMany({
          where: { role: "AGENCY", parentAgencyId: { not: null } },
          include: {
            parentAgency: true,
            agencyPermissionsReceived: { include: { grantor: true } },
            agencyPermissionsGiven: true,
          },
          orderBy: { createdAt: "desc" },
        });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sub Agencies</h1>
        <p className="text-sm text-slate-500">
          {user.role === "AGENCY"
            ? "Agencies that report to you. Control their commission visibility per relationship."
            : "All sub-agencies and their parent relationships."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{user.role === "AGENCY" ? "Your sub-agencies" : "Sub-agency relationships"}</CardTitle>
        </CardHeader>
        <CardContent>
          {subAgencies.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No sub-agencies.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-4">Sub-agency</th>
                    <th className="p-4">Parent</th>
                    <th className="p-4">Commission visibility</th>
                    <th className="p-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {subAgencies.map((a) => {
                    const perms =
                      user.role === "AGENCY"
                        ? a.agencyPermissionsReceived.find((p) => p.grantorId === user.id)
                        : a.agencyPermissionsReceived.find((p) => p.grantorId === a.parentAgencyId);
                    return (
                      <tr key={a.id}>
                        <td className="p-4">
                          <p className="font-medium">{fullName(a)}</p>
                          <p className="text-xs text-slate-500">{a.companyName ?? "—"} · {a.email}</p>
                        </td>
                        <td className="p-4 text-slate-500">{user.role === "AGENCY" ? "You" : fullName(a.parentAgency)}</td>
                        <td className="p-4">
                          <AgencyPermissionToggle
                            receiverId={a.id}
                            canViewCommission={Boolean(perms?.canViewCommission)}
                          />
                        </td>
                        <td className="p-4 text-slate-500">{formatDate(a.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}