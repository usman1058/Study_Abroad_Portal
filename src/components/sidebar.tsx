"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  FilePlus,
  Users,
  GraduationCap,
  BookOpen,
  Search,
  ClipboardList,
  Network,
  Percent,
  Wallet,
  ShieldCheck,
  BarChart3,
  ClipboardCheck,
  Star,
  Folder,
  MessageSquare,
  CreditCard,
  User,
  Settings,
  Globe, PanelLeftClose, PanelLeftOpen,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import type { Section } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/providers";
import { SidebarUserCreate } from "@/components/sidebar-user-create";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  file: FileText,
  filePlus: FilePlus,
  users: Users,
  graduation: GraduationCap,
  book: BookOpen,
  search: Search,
  clipboard: ClipboardList,
  network: Network,
  percent: Percent,
  wallet: Wallet,
  shield: ShieldCheck,
  chart: BarChart3,
  form: ClipboardCheck,
  star: Star,
  folder: Folder,
  message: MessageSquare,
  credit: CreditCard,
  user: User,
  settings: Settings,
  globe: Globe,
};

export function Sidebar({
  sections,
  role,
  userName,
  allowedRoles,
  counselors,
  mobileOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: { sections: Section[]; role: Role; userName: string; allowedRoles: Role[]; counselors: { id: string; label: string }[]; mobileOpen?: boolean; onClose?: () => void; collapsed?: boolean; onToggleCollapsed?: () => void }) {
  const pathname = usePathname();
  const { t } = useLang();

  const isPartner = role !== "STUDENT";

  return (
    <>
      {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={onClose} aria-label="Close navigation" />}
      <aside aria-label="Main navigation" className={cn("fixed inset-y-0 left-0 z-50 flex w-60 -translate-x-full flex-col border-r border-slate-200 bg-white transition-[transform,width] duration-200 dark:border-slate-800 dark:bg-slate-900 lg:z-40 lg:translate-x-0", collapsed ? "lg:w-16" : "lg:w-60", mobileOpen && "translate-x-0")}>
      <div className="relative flex h-16 items-center border-b border-slate-200 dark:border-slate-800"><Link href={role === "STUDENT" ? "/my-applications" : "/home"} onClick={onClose} className={cn("flex h-full flex-1 items-center gap-3 px-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/60", collapsed && "lg:justify-center lg:px-0")}>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm">SA</span>
        <span className={cn("min-w-0", collapsed && "lg:hidden")}><span className="block truncate text-sm font-bold">{t("StudyAbroad")}</span><span className="block truncate text-[11px] font-medium text-slate-500">{isPartner ? "Partner workspace" : "Student workspace"}</span></span>
      </Link>{onToggleCollapsed && <button type="button" onClick={onToggleCollapsed} className="absolute -right-3 top-5 hidden h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 lg:flex" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}</button>}</div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {sections.map((section) => {
          const Icon = ICONS[section.icon] ?? FileText;
          const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <Link
              key={section.key}
              href={section.href}
              onClick={onClose}
              aria-label={t(section.label)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                collapsed && "lg:justify-center lg:px-2",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn("truncate", collapsed && "lg:hidden")}>{t(section.label)}</span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-slate-200 p-3 dark:border-slate-800", collapsed && "lg:px-2")}>
        {isPartner && (
          <div className={cn(collapsed && "lg:hidden")}><SidebarUserCreate allowedRoles={allowedRoles} counselors={counselors} /></div>
        )}
        {role !== "STUDENT" && (
          <a
            href="https://wa.me/?text=StudyAbroad%20Portal"
            target="_blank"
            rel="noreferrer"
            className={cn("mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30", collapsed && "lg:justify-center lg:px-2")}
            aria-label={t("WhatsApp quick launch")}
          >
            <MessageCircle className="h-4 w-4" />
            <span className={cn(collapsed && "lg:hidden")}>{t("WhatsApp quick launch")}</span>
          </a>
        )}
        <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2", collapsed && "lg:justify-center lg:px-2")}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            {userName?.[0]?.toUpperCase() ?? "?"}
          </span>
          <span className={cn("truncate text-xs text-slate-500 dark:text-slate-400", collapsed && "lg:hidden")}>
            {userName} · {t(ROLE_LABELS[role])}
          </span>
        </div>
      </div>
      </aside>
    </>
  );
}
