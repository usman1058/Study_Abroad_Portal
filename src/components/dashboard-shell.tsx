"use client";

import { useState, type ReactNode } from "react";
import type { Role } from "@/generated/prisma/client";
import type { Section } from "@/lib/permissions";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export function DashboardShell({ children, sections, role, userName, userEmail, allowedRoles, counselors, preferredCurrency }: {
  children: ReactNode;
  sections: Section[];
  role: Role;
  userName: string;
  userEmail: string;
  allowedRoles: Role[];
  counselors: { id: string; label: string }[];
  preferredCurrency: string;
}) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  return (
    <div className="min-h-svh bg-slate-50/60 dark:bg-slate-950">
      <Sidebar sections={sections} role={role} userName={userName} allowedRoles={allowedRoles} counselors={counselors} mobileOpen={navigationOpen} onClose={() => setNavigationOpen(false)} />
      <div className="min-w-0 lg:pl-60">
        <Topbar role={role} userName={userName} userEmail={userEmail} preferredCurrency={preferredCurrency} onOpenNavigation={() => setNavigationOpen(true)} />
        <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
