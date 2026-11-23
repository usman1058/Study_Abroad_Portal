import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { sectionsForRole } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect("/");
  }

  const sections = sectionsForRole(user.role);
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { preferredCurrency: true } });

  return (
    <DashboardShell
        userEmail={user.email}
        sections={sections}
        role={user.role}
        userName={user.name}
        preferredCurrency={profile?.preferredCurrency ?? "MYR"}
      >
        {children}
      </DashboardShell>
  );
}
