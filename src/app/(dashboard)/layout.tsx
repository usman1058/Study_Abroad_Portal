import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { sectionsForRole, creatableRoles } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect("/");
  }

  const sections = sectionsForRole(user.role);
  const allowedRoles = creatableRoles(user.role);

  const counselors = await prisma.user.findMany({
    where: { role: "COUNSELOR" },
    select: { id: true, firstName: true, lastName: true },
  });

  return (
    <div className="min-h-svh">
      <Sidebar
        sections={sections}
        role={user.role}
        userName={user.name}
        allowedRoles={allowedRoles}
        counselors={counselors.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))}
      />
      <div className="pl-60">
        <Topbar role={user.role} userName={user.name} userEmail={user.email} />
        <main className="mx-auto max-w-7xl p-6">{children}</main>
      </div>
    </div>
  );
}