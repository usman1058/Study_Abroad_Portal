import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Users,
  ClipboardList,
  ShieldCheck,
  Plane,
  Activity,
  ArrowRight,
} from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency, toNum } from "@/lib/utils";
import type { ApplicationStage } from "@/generated/prisma/client";

export const metadata = { title: "Home" };

const TERMINAL: ApplicationStage[] = ["ENROLLED", "REJECTED", "WITHDRAWN"];

export default async function HomePage() {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [leadsThisWeek, appsInProgress, pendingDocs, visaApps, recentApps, recentUsers, unreadNotifs] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT", createdAt: { gte: weekAgo } } }),
      prisma.application.count({ where: { stage: { notIn: TERMINAL } } }),
      prisma.document.count({ where: { status: "PENDING" } }),
      prisma.application.count({ where: { stage: "VISA" } }),
      prisma.application.findMany({
        take: 8,
        orderBy: { updatedAt: "desc" },
        include: {
          student: { select: { id: true, firstName: true, lastName: true, email: true } },
          program: { select: { name: true, university: { select: { name: true } } } },
        },
      }),
      prisma.user.findMany({
        take: 8,
        where: { role: "STUDENT" },
        orderBy: { createdAt: "desc" },
        select: { id: true, firstName: true, lastName: true, country: true, createdAt: true },
      }),
      prisma.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);

  const kpis = [
    { label: "Leads this week", value: leadsThisWeek, icon: Users, href: "/users" },
    { label: "Applications in progress", value: appsInProgress, icon: ClipboardList, href: "/application" },
    { label: "Pending doc verifications", value: pendingDocs, icon: ShieldCheck, href: "/documents" },
    { label: "Applications at Visa stage", value: visaApps, icon: Plane, href: "/application" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user.name.split(" ")[0]} 👋</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {unreadNotifs > 0 ? `${unreadNotifs} unread notification${unreadNotifs > 1 ? "s" : ""}` : "You're all caught up."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="transition hover:border-brand-400">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{k.label}</p>
                  <p className="mt-1 text-2xl font-bold">{k.value}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-200">
                  <k.icon className="h-5 w-5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent applications</CardTitle>
            <Link href="/application" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentApps.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No applications yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentApps.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {a.student.firstName} {a.student.lastName} · {a.program.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {a.program.university.name} · updated {formatDate(a.updatedAt)}
                      </p>
                    </div>
                    <Badge tone={a.stage === "REJECTED" ? "red" : a.stage === "OFFER" ? "green" : "brand"}>
                      {a.stage.replace(/_/g, " ")}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>New leads</CardTitle>
            <Link href="/users" className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
              Manage users <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No student accounts yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentUsers.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/users/${s.id}`} className="min-w-0 hover:underline">
                      <p className="truncate text-sm font-medium">
                        {s.firstName} {s.lastName}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {s.country ?? "—"} · joined {formatDate(s.createdAt)}
                      </p>
                    </Link>
                    <Badge tone="slate">New</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}