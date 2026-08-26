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
  Globe,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import type { Section } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/providers";
import { LanguageSwitcher } from "@/components/language-switcher";
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
}: { sections: Section[]; role: Role; userName: string; allowedRoles: Role[]; counselors: { id: string; label: string }[] }) {
  const pathname = usePathname();
  const { t } = useLang();

  const isPartner = role !== "STUDENT";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="h-16 border-b border-slate-200 dark:border-slate-800" aria-hidden />

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {sections.map((section) => {
          const Icon = ICONS[section.icon] ?? FileText;
          const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <Link
              key={section.key}
              href={section.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(section.label)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        {isPartner && (
          <SidebarUserCreate allowedRoles={allowedRoles} counselors={counselors} />
        )}
        <LanguageSwitcher />
        {role !== "STUDENT" && (
          <a
            href="https://wa.me/?text=StudyAbroad%20Portal"
            target="_blank"
            rel="noreferrer"
            className="mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          >
            <MessageCircle className="h-4 w-4" />
            {t("WhatsApp quick launch")}
          </a>
        )}
        <div className="flex items-center gap-2 rounded-lg px-3 py-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            {userName?.[0]?.toUpperCase() ?? "?"}
          </span>
          <span className="truncate text-xs text-slate-500 dark:text-slate-400">
            {userName} · {t(ROLE_LABELS[role])}
          </span>
        </div>
      </div>
    </aside>
  );
}