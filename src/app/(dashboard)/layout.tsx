import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { sectionsForRole, creatableRoles } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect("/");
  }

  const sections = sectionsForRole(user.role);
  const allowedRoles = creatableRoles(user.role);

  const [counselors, profile] = await Promise.all([
    ["SUPER_ADMIN", "MANAGER"].includes(user.role)
      ? prisma.user.findMany({
        where: { role: "COUNSELOR" },
        select: { id: true, firstName: true, lastName: true },
      })
      : Promise.resolve([]),
    prisma.user.findUnique({ where: { id: user.id }, select: { preferredCurrency: true } }),
  ]);

  return (
    <DashboardShell
        userEmail={user.email}
        sections={sections}
        role={user.role}
        userName={user.name}
        allowedRoles={allowedRoles}
        counselors={counselors.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))}
        preferredCurrency={profile?.preferredCurrency ?? "MYR"}
      >
        {children}
      </DashboardShell>
  );
}
