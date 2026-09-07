"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, Sun, Moon, LogOut, CheckCheck, ExternalLink } from "lucide-react";
import { useTheme, useLang } from "@/components/providers";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/generated/prisma/client";

export function Topbar({ role, userName, userEmail }: { role: Role; userName: string; userEmail: string }) {
  const { theme, toggle } = useTheme();
  const { t } = useLang();
  const [unread, setUnread] = useState(0);
  const [openMenu, setOpenMenu] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; body?: string | null; readAt?: string | null; createdAt: string; data?: { href?: string } | null }[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/notifications", { signal: controller.signal })
      .then((r) => r.json())
      .then((j) => { const items = j?.data?.data ?? []; setNotifications(items); setUnread(items.filter((n: { readAt?: string | null }) => !n.readAt).length); })
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

        <div className="relative">
        <button onClick={() => setOpenNotifications((v) => !v)} className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
        {openNotifications && <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenNotifications(false)} />
          <div className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800"><div><p className="font-semibold">Notifications</p><p className="text-xs text-slate-500">{unread ? `${unread} unread` : "You're all caught up"}</p></div>{unread > 0 && <button className="text-xs text-brand-600 hover:underline" onClick={async () => { await fetch("/api/notifications", { method: "PUT" }); setNotifications((items) => items.map((n) => ({ ...n, readAt: new Date().toISOString() }))); setUnread(0); }}>Mark all read</button>}</div>
            <div className="max-h-96 overflow-y-auto">{notifications.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">No notifications yet.</p> : notifications.slice(0, 8).map((n) => <button key={n.id} className={cn("flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60", !n.readAt && "bg-brand-50/50 dark:bg-brand-900/10")} onClick={async () => { if (!n.readAt) { await fetch(`/api/notifications/${n.id}`, { method: "PUT" }); setNotifications((items) => items.map((x) => x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)); setUnread((v) => Math.max(0, v - 1)); } if (n.data?.href) window.location.href = n.data.href; }}><span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-slate-300" : "bg-brand-600")} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{n.title}</span>{n.body && <span className="mt-0.5 block text-xs text-slate-500">{n.body}</span>}<span className="mt-1 block text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</span></span>{n.data?.href && <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-slate-400" />}</button>)}</div>
            <Link href="/messages" onClick={() => setOpenNotifications(false)} className="flex items-center justify-center gap-2 p-3 text-xs font-medium text-brand-600 hover:bg-slate-50 dark:hover:bg-slate-800"><CheckCheck className="h-3.5 w-3.5" /> Open message center</Link>
          </div>
        </>}
        </div>

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
