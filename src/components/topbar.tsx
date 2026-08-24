"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, Sun, Moon, LogOut } from "lucide-react";
import { useTheme, useLang } from "@/components/providers";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";

export function Topbar({ role, userName, userEmail }: { role: Role; userName: string; userEmail: string }) {
  const { theme, toggle } = useTheme();
  const { t } = useLang();
  const [unread, setUnread] = useState(0);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/notifications/unread-count", { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => j?.data?.count != null && setUnread(j.data.count))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <Link
        href={role === "STUDENT" ? "/my-applications" : "/home"}
        className="flex items-center gap-2.5"
        aria-label="Home"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">SA</span>
        <span className="hidden truncate text-base font-semibold sm:block">{t("StudyAbroad")}</span>
      </Link>

      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <a
          href="/messages"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="Messages and notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </a>

        <div className="relative">
          <button
            onClick={() => setOpenMenu((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
              {userName?.[0]?.toUpperCase() ?? "?"}
            </span>
            <span className="hidden text-left sm:block">
              <span className="block text-sm font-semibold leading-tight">{userName}</span>
              <span className="block text-xs leading-tight text-slate-500">{t(ROLE_LABELS[role])}</span>
            </span>
          </button>
          {openMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(false)} />
              <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-1 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                  <p className="text-sm font-semibold">{userName}</p>
                  <p className="truncate text-xs text-slate-500">{userEmail}</p>
                  <span className={cn(
                    "mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                    role === "STUDENT"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
                      : "bg-brand-100 text-brand-800 dark:bg-brand-900/50 dark:text-brand-200"
                  )}>
                    {t(ROLE_LABELS[role])}
                  </span>
                </div>
                <Link href="/profile" onClick={() => setOpenMenu(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                  {t("Profile")}
                </Link>
                <Link href="/settings" onClick={() => setOpenMenu(false)} className="block rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                  {t("Settings")}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <LogOut className="h-4 w-4" /> {t("Sign out")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
