"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Bell, Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "@/components/providers";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";
import { useLang } from "@/components/providers";

export function Topbar({ role, userName }: { role: Role; userName: string }) {
  const { theme, toggle } = useTheme();
  const { t } = useLang();
  const [unread, setUnread] = useState(0);
  const [openMenu, setOpenMenu] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/unread-count")
      .then((r) => r.json())
      .then((j) => j?.data?.count != null && setUnread(j.data.count))
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <button
        onClick={toggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <a
        href="/messages"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Messages"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </a>

      <div className="relative">
        <button
          onClick={() => setOpenMenu((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {userName?.[0]?.toUpperCase() ?? "?"}
          </span>
          <span className="hidden text-xs font-medium sm:block">
            {userName}
            <span className="block text-[10px] font-normal text-slate-400">{t(ROLE_LABELS[role])}</span>
          </span>
        </button>
        {openMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(false)} />
            <div className="absolute right-0 z-50 mt-2 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <a href="/profile" className={cn("block rounded-md px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800")}>
                {t("Profile")}
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <LogOut className="h-4 w-4" /> {t("Sign out")}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}