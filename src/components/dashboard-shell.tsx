"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Section } from "@/lib/permissions";
import { sectionsForRole } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/client";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA84BIjO8S4MoGozd739eWN6Yz-dBD2iD0RWU1XC6wHSQaVkLykutUIHr875thTDDbvYUaZxUY6Xpol3RWvtHYhk5hQy3RKQvNsPg9CEYeNzp2Xj8DkjUdgvY9XPB576PjzkmaXzzLHlxg8Hn_INktmvJOEDWvcW7Yzv6grsxGCGkbqGO5mhseLdHjCEXlbdnQZ6tQYxOq3PH_I5BObTmsiQqqLkX4Zscf3tOYtG0FdP1R6Vu9tUaaq";
const AVATAR_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCaz6BflblY3jS0ftTAUr_asKuMTnemHLoaUzhVD5N3rnT6TT-IUUr00jUo9-mOSaJYJv1Dkg8swuez22qT613hwdjQU2JYNPM8blz4BAn-b40nxZGE8JjOXAKo89ppmURl_yk6p1XKH3o8f7d689JIhH-fiSoqv1jVMgAuV9yK-lncgrOCW1LbwVWXxmKeYRfHWHwGJYreqDTKtFyW48Tcl4WYY_yWJqfZMFq_rxgiBnmcFZFV24Rp";

const MATERIAL: Record<string, string> = {
  home: "dashboard",
  applications: "folder_shared",
  programs: "school",
  users: "group",
  scholarships: "workspace_premium",
  "short-courses": "auto_stories",
  documents: "verified_user",
  "partner-commissions": "price_check",
  transaction: "account_balance_wallet",
  reports: "query_stats",
  "visitor-form": "contact_page",
  messages: "chat",
  settings: "tune",
  "my-applications": "folder_shared",
  apply: "file_plus",
  "my-shortlist": "star",
  payments: "payment",
};

const PARTNER_ORDER = [
  "home",
  "applications",
  "programs",
  "users",
  "scholarships",
  "short-courses",
  "documents",
  "partner-commissions",
  "transaction",
  "reports",
  "visitor-form",
  "messages",
  "settings",
];

const STUDENT_ORDER = [
  "my-applications",
  "programs",
  "scholarships",
  "short-courses",
  "messages",
  "payments",
  "profile",
  "settings",
];

export function DashboardShell({
  children,
  sections,
  role,
  userName,
}: {
  children: React.ReactNode;
  sections: Section[];
  role: Role;
  userName?: string;
}) {
  const pathname = usePathname();
  const byKey = Object.fromEntries(sections.map((s) => [s.key, s]));
  const ordered =
    role === "STUDENT"
      ? STUDENT_ORDER.filter((k) => byKey[k])
      : PARTNER_ORDER.filter((k) => byKey[k]);

  return (
    <div className="min-h-svh bg-surface">
      <aside className="fixed left-0 top-0 h-screen w-72 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between overflow-y-auto">
        <div className="flex flex-col">
          <div className="h-16 px-space-md flex items-center justify-between bg-surface-container-lowest">
            <div className="flex items-center gap-space-xs">
              <img alt="StudyAbroad Portal Logo" className="h-8 w-auto object-contain" src={LOGO_URL} />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface tracking-tight leading-none">StudyAbroad</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wider uppercase">Partner Portal</span>
              </div>
            </div>
          </div>
          <div className="px-space-md py-space-xs">
            <div className="bg-surface-container-low rounded-lg p-space-xs flex items-center gap-space-xs">
              <span className="w-2 h-2 rounded-full bg-status-verified flex-shrink-0"></span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">Executive Workspace</span>
                <span className="font-code-table text-code-table text-on-surface-variant">Manager / Super Admin</span>
              </div>
            </div>
          </div>
          <div className="px-space-md py-space-xs">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-space-xs bg-navy-surface hover:bg-navy-deep text-on-primary font-label-md text-label-md py-space-xs px-space-md rounded-lg shadow-[0_1px_3px_rgba(15,32,66,0.04)] transition-colors"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>Create Student</span>
            </button>
          </div>
          <div className="px-space-md pt-space-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold tracking-wider uppercase">Navigation</span>
          </div>
          <nav className="px-space-md py-space-xs flex flex-col gap-space-2xs">
            {ordered.map((key) => {
              const section = byKey[key];
              if (!section) return null;
              const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
              return (
                <Link
                  key={section.key}
                  href={section.href}
                  className={cn(
                    "flex items-center gap-space-xs px-space-xs py-space-xs rounded-lg font-label-md text-label-md transition-colors",
                    active
                      ? "bg-navy-surface text-on-primary font-medium shadow-[0_1px_3px_rgba(15,32,66,0.04)]"
                      : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
                  )}
                >
                  <span className={cn("material-symbols-outlined text-xl", active ? "text-on-primary" : "text-on-surface-variant")}>
                    {MATERIAL[section.key] ?? "file"}
                  </span>
                  <span>{section.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-space-md flex flex-col gap-space-xs">
          <a
            className="flex items-center justify-between px-space-xs py-space-xs bg-status-verified-subtle rounded-lg text-status-verified hover:bg-status-verified/15 transition-colors"
            href="https://wa.me/"
            rel="noopener"
            target="_blank"
          >
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-lg">support_agent</span>
              <span className="font-label-md text-label-md font-semibold text-on-surface">WhatsApp Desk</span>
            </div>
            <span className="material-symbols-outlined text-base">open_in_new</span>
          </a>
          <div className="flex items-center justify-between text-on-surface-variant pt-space-2xs">
            <span className="font-code-table text-code-table">v3.4.2 · Compliance Mode</span>
            <span className="font-code-table text-code-table">UTC+0</span>
          </div>
        </div>
      </aside>
      <div className="pl-72">
        <header className="fixed top-0 left-72 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-md">
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-2xs font-label-md text-label-md text-on-surface-variant">
              <span className="hover:text-on-surface cursor-pointer">Workspace</span>
              <span className="material-symbols-outlined text-sm text-outline-variant">chevron_right</span>
              <span className="font-semibold text-on-surface">Executive Portal</span>
            </div>
            <div className="w-96 flex items-center bg-surface-container-low rounded-lg px-space-xs py-space-2xs gap-space-xs">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">search</span>
              <input
                className="w-full bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
                placeholder="Search students, passport #, programs, universities..."
                type="text"
              />
            </div>
          </div>
          <div className="flex items-center gap-space-md">
            <div className="flex items-center bg-surface-container-low rounded-lg p-space-2xs gap-space-2xs font-label-sm text-label-sm font-semibold">
              <button type="button" className="px-space-xs py-space-2xs rounded bg-surface-container-lowest shadow-[0_1px_3px_rgba(15,32,66,0.04)] text-on-surface">
                USD
              </button>
              <button type="button" className="px-space-xs py-space-2xs rounded text-on-surface-variant hover:text-on-surface">MYR</button>
              <button type="button" className="px-space-xs py-space-2xs rounded text-on-surface-variant hover:text-on-surface">GBP</button>
              <button type="button" className="px-space-xs py-space-2xs rounded text-on-surface-variant hover:text-on-surface">AUD</button>
              <button type="button" className="px-space-xs py-space-2xs rounded text-on-surface-variant hover:text-on-surface">EUR</button>
            </div>
            <button
              aria-label="Notifications"
              className="relative p-space-xs rounded-lg text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-error text-on-error font-label-sm text-[10px] leading-tight flex items-center justify-center rounded-full font-bold">
                3
              </span>
            </button>
            <div className="flex items-center gap-space-xs pl-space-xs">
              <img alt="Profile" className="w-8 h-8 rounded-full object-cover" src={AVATAR_URL} />
              <div className="flex flex-col text-left">
                <span className="font-label-md text-label-md font-semibold text-on-surface leading-tight">{userName ?? "Sarah Lin"}</span>
                <span className="font-code-table text-code-table text-on-surface-variant leading-tight">{ROLE_LABELS[role] ?? "Senior Partner Manager"}</span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-base cursor-pointer hover:text-on-surface">expand_more</span>
            </div>
          </div>
        </header>
        <main className="w-full pt-16 bg-surface min-h-screen">
          <div className="flex flex-col w-full">
            <div className="p-space-lg lg:p-margin max-w-7xl mx-auto w-full space-y-space-lg">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
