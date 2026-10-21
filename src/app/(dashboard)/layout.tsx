import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { sectionsForRole } from "@/lib/permissions";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect("/");
  }

  const sections = sectionsForRole(user.role);

  return (
    <DashboardShell sections={sections} role={user.role} userName={user.name}>
      {children}
    </DashboardShell>
  );
}
