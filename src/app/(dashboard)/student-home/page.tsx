import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, FileCheck2, GraduationCap, MessageSquare, ArrowRight } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, humanize } from "@/lib/utils";

export const metadata = { title: "Student Home" };

export default async function StudentHomePage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect("/home");
  const [applications, totalApplications, pendingDocuments, unreadMessages] = await Promise.all([
    prisma.application.findMany({ where: { studentId: user.id }, orderBy: { updatedAt: "desc" }, take: 5, include: { program: { select: { name: true, university: { select: { name: true } } } } } }),
    prisma.application.count({ where: { studentId: user.id } }),
    prisma.document.count({ where: { ownerId: user.id, status: { not: "VERIFIED" } } }),
    prisma.message.count({ where: { recipientId: user.id, readAt: null } }),
  ]);
  const metrics = [{ label: "Applications", value: totalApplications, href: "/my-applications", icon: ClipboardList }, { label: "Documents needing attention", value: pendingDocuments, href: "/documents", icon: FileCheck2 }, { label: "Unread messages", value: unreadMessages, href: "/messages", icon: MessageSquare }];
  return <div className="space-y-6">
    <section className="rounded-2xl bg-gradient-to-r from-navy-900 to-brand-700 p-6 text-white shadow-sm sm:p-8"><p className="text-sm font-medium text-blue-100">Student workspace</p><h1 className="mt-1 text-2xl font-bold sm:text-3xl">Welcome, {user.name.split(" ")[0]}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-blue-100">Track your study journey, keep your documents ready, and get help from your consultant or Admin.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/my-applications" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-700"><ClipboardList className="h-4 w-4" /> View my applications</Link><Link href="/scholarships" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/30 px-4 text-sm font-semibold text-white hover:bg-white/10"><GraduationCap className="h-4 w-4" /> Explore scholarships</Link></div></section>
    <section aria-label="Student overview" className="grid gap-3 sm:grid-cols-3">{metrics.map(({ label, value, href, icon: Icon }) => <Link key={label} href={href}><Card className="h-full transition hover:border-brand-300 hover:shadow-md"><CardContent className="flex items-center justify-between gap-3 p-5"><div><p className="text-sm text-ink-muted">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div><Icon className="h-5 w-5 text-brand-600" /></CardContent></Card></Link>)}</section>
    <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Recent application updates</CardTitle><p className="mt-1 text-sm text-ink-muted">Your latest cases and their current status.</p></div><Link href="/my-applications" className="inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">All applications <ArrowRight className="h-4 w-4" /></Link></CardHeader><CardContent>{applications.length ? <ul className="divide-y divide-line dark:divide-navy-700">{applications.map((application) => <li key={application.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{application.program.name}</p><p className="text-xs text-ink-muted">{application.program.university.name} · updated {formatDate(application.updatedAt)}</p></div><Badge tone={application.stage === "REJECTED" ? "red" : ["OFFER", "ENROLLED"].includes(application.stage) ? "green" : "brand"}>{humanize(application.stage)}</Badge></li>)}</ul> : <p className="py-8 text-center text-sm text-ink-muted">No applications yet. Browse scholarships or programs to get started.</p>}</CardContent></Card>
  </div>;
}
