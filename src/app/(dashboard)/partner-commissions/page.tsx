import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { serializeProgram } from "@/lib/queries";
import { FeeDisplay } from "@/components/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Partner Commissions" };

export default async function PartnerCommissionsPage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT" || user.role === "COUNSELOR") redirect("/");

  const programs = await prisma.program.findMany({ include: { university: true }, orderBy: [{ university: { name: "asc" } }, { name: "asc" }] });

  // For agency partners: whether this relationship may view commission numbers is
  // controlled by AgencyPermission.canViewCommission from their parent.
  let mayViewRates = user.role === "SUPER_ADMIN" || user.role === "MANAGER";
  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { parentAgencyId: true } });
  const parentAgencyId = dbUser?.parentAgencyId ?? null;
  if (user.role === "AGENCY" && parentAgencyId) {
    const perm = await prisma.agencyPermission.findUnique({
      where: { grantorId_receiverId: { grantorId: parentAgencyId, receiverId: user.id } },
    });
    mayViewRates = Boolean(perm?.canViewCommission);
  }

  const avgRate = programs.length ? programs.reduce((s, p) => s + Number(p.commissionRate), 0) / programs.length : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Partner Commissions</h1>
        <p className="text-sm text-slate-500">
          Commission rates are set by the portal owner. Shown per program.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Programs</p><p className="mt-1 text-2xl font-bold">{programs.length}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Average rate</p><p className="mt-1 text-2xl font-bold">{avgRate.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-slate-500">Visibility</p><p className="mt-1 text-2xl font-bold">{mayViewRates ? "Visible" : "Restricted"}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Commission rates by program</CardTitle>
        </CardHeader>
        <CardContent>
          {mayViewRates ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="p-4">Program</th>
                  <th className="p-4">University</th>
                  <th className="p-4">Tuition</th>
                  <th className="p-4">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {programs.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4">
                      <Link href={`/scholarships/${p.slug ?? p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    </td>
                    <td className="p-4 text-slate-500">{p.university.name}</td>
                    <td className="p-4"><FeeDisplay amount={serializeProgram(p).tuitionFee} /></td>
                    <td className="p-4">
                      <Badge tone="green">{Number(p.commissionRate)}%</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">
              Your commission visibility is restricted by your parent agency.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}