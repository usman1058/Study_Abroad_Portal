"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Role } from "@/generated/prisma/client";
import type { Section } from "@/lib/permissions";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { TemporaryPasswordChange } from "@/components/temporary-password-change";
import { PortalFooter } from "@/components/portal-footer";

export function DashboardShell({ children, sections, role, userName, userEmail, preferredCurrency, mustChangePassword = false }: {
  children: ReactNode;
  sections: Section[];
  role: Role;
  userName: string;
  userEmail: string;
  preferredCurrency: string;
  mustChangePassword?: boolean;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (
    <div className="min-h-svh bg-canvas dark:bg-navy-950">
      <Sidebar sections={sections} role={role} userName={userName} mobileOpen={navigationOpen} onClose={() => setNavigationOpen(false)} collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)} />
      <div className={cn("flex min-h-svh min-w-0 flex-col transition-[padding] duration-200", sidebarCollapsed ? "lg:pl-16" : "lg:pl-60")}>
        <Topbar role={role} userName={userName} userEmail={userEmail} preferredCurrency={preferredCurrency} onOpenNavigation={() => setNavigationOpen(true)} />
        <main className="portal-main mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">{children}</main>
        <PortalFooter />
      </div>
      {mustChangePassword && <TemporaryPasswordChange email={userEmail} homeHref={role === "STUDENT" ? "/student-home" : "/home"} />}
    </div>
  );
}
