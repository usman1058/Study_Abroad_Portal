import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { sectionsForRole } from "@/lib/permissions";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect("/");
  }

  const sections = sectionsForRole(user.role);

  return (
    <div className="min-h-svh">
      <Sidebar sections={sections} role={user.role} userName={user.name} />
      <div className="pl-60">
        <Topbar role={user.role} userName={user.name} />
        <main className="mx-auto max-w-7xl p-6">{children}</main>
      </div>
    </div>
  );
}