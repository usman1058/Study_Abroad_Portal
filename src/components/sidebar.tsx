"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { Section } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";
import { useLang } from "@/components/providers";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  megaphone: Megaphone,
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
  mobileOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapsed,
}: { sections: Section[]; role: Role; userName: string; mobileOpen?: boolean; onClose?: () => void; collapsed?: boolean; onToggleCollapsed?: () => void }) {
  const pathname = usePathname();
  const { t } = useLang();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  useEffect(() => {
    let active = true;
    const refreshWhatsApp = () => {
      fetch("/api/portal-settings", { cache: "no-store" })
        .then((response) => response.json())
        .then((json) => {
          if (active) setWhatsappNumber((json?.data?.whatsappNumber ?? "").replace(/\D/g, ""));
        })
        .catch(() => { if (active) setWhatsappNumber(""); });
    };
    refreshWhatsApp();
    window.addEventListener("focus", refreshWhatsApp);
    window.addEventListener("portal-contact-settings-updated", refreshWhatsApp);
    return () => {
      active = false;
      window.removeEventListener("focus", refreshWhatsApp);
      window.removeEventListener("portal-contact-settings-updated", refreshWhatsApp);
    };
  }, []);

  const isPartner = role !== "STUDENT";

  return (
    <>
      {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-navy-950/50 lg:hidden" onClick={onClose} aria-label="Close navigation" />}
      <aside aria-label="Main navigation" className={cn("fixed inset-y-0 left-0 z-50 flex w-60 -translate-x-full flex-col border-r border-line bg-gradient-to-b from-white via-[#f8f9ff] to-[#eaf0ff] transition-[transform,width] duration-200 dark:border-navy-800 dark:from-[#111429] dark:via-[#171c3b] dark:to-[#202a54] lg:z-40 lg:translate-x-0", collapsed ? "lg:w-16" : "lg:w-60", mobileOpen && "translate-x-0")}>
      <div className="relative flex h-[5.25rem] items-center border-b border-line dark:border-navy-800"><Link href={role === "STUDENT" ? "/student-home" : "/home"} onClick={onClose} aria-label={`${t("CheckMyUni")} ${isPartner ? "partner" : "student"} workspace home`} className={cn("flex h-full flex-1 items-center gap-3 px-4 transition hover:bg-brand-50/80 dark:hover:bg-white/5", collapsed && "lg:justify-center lg:px-0")}>
        <Image src="/checkmyuni-full-logo.png" alt="" aria-hidden="true" width={76} height={57} priority unoptimized className={cn("h-auto w-[4.75rem] shrink-0", collapsed && "lg:w-12")} />
        {isPartner && <span className={cn("min-w-0", collapsed && "lg:hidden")}><span className="block truncate text-[11px] font-medium text-ink-muted dark:text-navy-200">Partner workspace</span></span>}
      </Link>{onToggleCollapsed && <button type="button" onClick={onToggleCollapsed} className="absolute -right-3 top-5 hidden h-6 w-6 items-center justify-center rounded-full border border-line-strong bg-white text-navy-700 shadow-sm hover:bg-brand-50 hover:text-brand-800 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-200 dark:hover:bg-navy-700 dark:hover:text-white lg:flex" aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}>{collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}</button>}</div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {sections.map((section) => {
          const Icon = ICONS[section.icon] ?? FileText;
          const active = pathname === section.href || pathname.startsWith(`${section.href}/`);
          return (
            <Link
              key={section.key}
              href={section.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              aria-label={t(section.label)}
              className={cn(
                "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                collapsed && "lg:justify-center lg:px-2",
                active
                  ? "bg-gradient-to-r from-[#5b3aab] to-[#354dc3] text-white shadow-sm shadow-blue-950/15"
                  : "text-navy-700 hover:bg-brand-50 hover:text-brand-900 dark:text-navy-200 dark:hover:bg-white/10 dark:hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className={cn("truncate", collapsed && "lg:hidden")}>{t(section.label)}</span>
            </Link>
          );
        })}
      </nav>

      <div className={cn("border-t border-line p-3 dark:border-navy-800", collapsed && "lg:px-2")}>
        {role !== "STUDENT" && whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent("CheckMyUni Portal")}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("mb-2 flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 hover:text-emerald-950 dark:text-emerald-300 dark:hover:bg-white/5 dark:hover:text-emerald-200", collapsed && "lg:justify-center lg:px-2")}
            aria-label={t("WhatsApp quick launch")}
          >
            <MessageCircle className="h-4 w-4" />
            <span className={cn(collapsed && "lg:hidden")}>{t("WhatsApp quick launch")}</span>
          </a>
        )}
        <div className={cn("flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#17213e] to-[#314783] px-3 py-2.5 text-white shadow-sm dark:from-[#29214f] dark:to-[#263f80]", collapsed && "lg:justify-center lg:px-2")}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#8b6ce0] to-[#3d69d8] text-xs font-bold text-white ring-1 ring-white/30">
            {userName?.[0]?.toUpperCase() ?? "?"}
          </span>
          <span className={cn("truncate text-xs font-medium text-white/95", collapsed && "lg:hidden")}>
            {userName} · {t(ROLE_LABELS[role])}
          </span>
        </div>
      </div>
      </aside>
    </>
  );
}
