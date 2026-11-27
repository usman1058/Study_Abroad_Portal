import Link from "next/link";
import { redirect } from "next/navigation";
import { Search as SearchIcon, GraduationCap, Building2, BookOpen, Users, FileText, Award } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { studentScopeWhere } from "@/lib/permissions";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROGRAM_LEVELS, programLevelLabel } from "@/lib/constants";
import { getWorkingCountries } from "@/lib/working-countries";
import { formatDate, fullName, humanize } from "@/lib/utils";
import type { Prisma } from "@/generated/prisma/client";
import { ResponsiveFilterPanel } from "@/components/responsive-filter-panel";

export const metadata = { title: "Advanced search" };
const TYPES = ["all", "programs", "scholarships", "universities", "short-courses", "students", "consultants", "applications"] as const;
const APPLICATION_STAGES = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "OFFER", "DEPOSIT_PAID", "VISA", "ENROLLED", "REJECTED", "WITHDRAWN"] as const;
type ResultType = (typeof TYPES)[number];
type SearchParams = Promise<{ q?: string; type?: string; country?: string; level?: string; status?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (!user || user.role === "STUDENT") redirect("/");
  const { q: rawQ = "", type: rawType = "all", country = "", level = "", status = "" } = await searchParams;
  const q = rawQ.trim().slice(0, 160);
  const type: ResultType = TYPES.includes(rawType as ResultType) ? rawType as ResultType : "all";
  const validStatus = APPLICATION_STAGES.includes(status as (typeof APPLICATION_STAGES)[number]) ? status as (typeof APPLICATION_STAGES)[number] : "";
  const countries = await getWorkingCountries();
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const searchable = (key: ResultType) => type === "all" || type === key;
  const text = (field: string) => ({ [field]: { contains: q, mode: "insensitive" as const } });
  const programWhere: Prisma.ProgramWhereInput = {
    ...(q ? { OR: [text("id"), text("name"), text("field"), { university: { name: { contains: q, mode: "insensitive" } } }] } : {}),
    ...(country ? { university: { country: { equals: country, mode: "insensitive" } } } : {}),
    ...(level ? { level } : {}),
  };
  const universityWhere: Prisma.UniversityWhereInput = {
    ...(q ? { OR: [text("id"), text("name"), text("city")] } : {}),
    ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
  };
  const scholarshipWhere: Prisma.ScholarshipWhereInput = {
    ...(user.role !== "SUPER_ADMIN" ? { isActive: true } : {}),
    ...(q ? { OR: [text("id"), text("name"), text("providerName"), text("subject"), text("description"), { universities: { some: { university: { name: { contains: q, mode: "insensitive" } } } } }, { programs: { some: { program: { name: { contains: q, mode: "insensitive" } } } } }] } : {}),
    ...(country ? { universities: { some: { university: { country: { equals: country, mode: "insensitive" } } } } } : {}),
    ...(level ? { studyLevels: { has: level } } : {}),
  };
  const shortCourseWhere: Prisma.ShortCourseWhereInput = {
    ...(user.role === "SUPER_ADMIN" ? (status === "draft" ? { status: "draft" } : status === "active" ? { status: "active" } : {}) : { status: "active" }),
    ...(q ? { OR: [text("id"), text("title"), text("provider"), text("description")] } : {}),
  };
  const studentWhere: Prisma.UserWhereInput = {
    ...studentScopeWhere(user),
    ...(q ? { OR: [text("id"), text("firstName"), text("lastName"), text("email")] } : {}),
    ...(country ? { country: { equals: country, mode: "insensitive" } } : {}),
  };
  const consultantWhere: Prisma.UserWhereInput = {
    role: "COUNSELOR",
    ...(user.role === "AGENCY" ? { createdById: user.id } : {}),
    ...(q ? { OR: [text("id"), text("firstName"), text("lastName"), text("email"), text("companyName")] } : {}),
  };
  const applicationWhere: Prisma.ApplicationWhereInput = {
    ...(user.role === "SUPER_ADMIN" || user.role === "MANAGER" ? {} : { student: studentScopeWhere(user) }),
    ...(validStatus ? { stage: validStatus } : {}),
    ...(q ? { OR: [text("id"), { student: { is: { OR: [text("id"), text("firstName"), text("lastName"), text("email")] } } }, { program: { is: { OR: [text("name"), { university: { name: { contains: q, mode: "insensitive" } } }] } } }] } : {}),
  };
  const take = 7;

  const [programs, programTotal, universities, universityTotal, scholarships, scholarshipTotal, courses, courseTotal, students, studentTotal, consultants, consultantTotal, applications, applicationTotal] = await Promise.all([
    searchable("programs") ? prisma.program.findMany({ where: programWhere, include: { university: true }, orderBy: [{ university: { name: "asc" } }, { name: "asc" }], take }) : [],
    searchable("programs") ? prisma.program.count({ where: programWhere }) : 0,
    searchable("universities") ? prisma.university.findMany({ where: universityWhere, include: { _count: { select: { programs: true } } }, orderBy: { name: "asc" }, take }) : [],
    searchable("universities") ? prisma.university.count({ where: universityWhere }) : 0,
    searchable("scholarships") ? prisma.scholarship.findMany({ where: scholarshipWhere, orderBy: { name: "asc" }, take }) : [],
    searchable("scholarships") ? prisma.scholarship.count({ where: scholarshipWhere }) : 0,
    searchable("short-courses") ? prisma.shortCourse.findMany({ where: shortCourseWhere, orderBy: { createdAt: "desc" }, take }) : [],
    searchable("short-courses") ? prisma.shortCourse.count({ where: shortCourseWhere }) : 0,
    searchable("students") ? prisma.user.findMany({ where: studentWhere, select: { id: true, firstName: true, lastName: true, email: true, country: true, assignedCounselor: { select: { id: true, firstName: true, lastName: true } } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], take }) : [],
    searchable("students") ? prisma.user.count({ where: studentWhere }) : 0,
    searchable("consultants") && user.role !== "COUNSELOR" ? prisma.user.findMany({ where: consultantWhere, select: { id: true, firstName: true, lastName: true, email: true, _count: { select: { assignedStudents: user.role === "AGENCY" ? { where: { role: "STUDENT", createdById: user.id } } : true } } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }], take }) : [],
    searchable("consultants") && user.role !== "COUNSELOR" ? prisma.user.count({ where: consultantWhere }) : 0,
    searchable("applications") ? prisma.application.findMany({ where: applicationWhere, include: { student: { select: { id: true, firstName: true, lastName: true } }, program: { select: { id: true, name: true, university: { select: { name: true } } } } }, orderBy: { updatedAt: "desc" }, take }) : [],
    searchable("applications") ? prisma.application.count({ where: applicationWhere }) : 0,
  ]);

  const sections = [
    { key: "programs", title: "Programs", icon: GraduationCap, total: programTotal, href: "/programs", rows: programs.map((p) => ({ id: p.id, title: p.name, subtitle: `${p.university.name} · ${p.university.country} · ${programLevelLabel(p.level)}`, href: `/programs/${p.id}`, tag: p.field })) },
    { key: "scholarships", title: "Scholarships", icon: Award, total: scholarshipTotal, href: "/scholarships", rows: scholarships.map((s) => ({ id: s.id, title: s.name, subtitle: `${s.providerName || humanize(s.category)} · ${s.eligibleCountries.join(", ") || "Open eligibility"}`, href: `/scholarships/${s.slug}`, tag: humanize(s.awardType) })) },
    { key: "universities", title: "Universities", icon: Building2, total: universityTotal, href: "/programs", rows: universities.map((u) => ({ id: u.id, title: u.name, subtitle: `${u.city ? `${u.city} · ` : ""}${u.country} · ${u._count.programs} programs`, href: isSuperAdmin ? `/universities/${u.id}` : `/programs?country=${encodeURIComponent(u.country)}`, tag: "University" })) },
    { key: "short-courses", title: "Short courses", icon: BookOpen, total: courseTotal, href: "/short-courses", rows: courses.map((c) => ({ id: c.id, title: c.title, subtitle: `${c.provider} · ${humanize(c.category)} · ${c.deliveryMode}`, href: `/short-courses/${c.id}`, tag: humanize(c.paymentType) })) },
    { key: "students", title: "Students you manage", icon: Users, total: studentTotal, href: "/users?role=STUDENT", rows: students.map((s) => ({ id: s.id, title: fullName(s), subtitle: `${s.email}${s.country ? ` · ${s.country}` : ""}`, href: `/users/${s.id}`, tag: s.assignedCounselor ? `Consultant: ${fullName(s.assignedCounselor)}` : "Admin managed" })) },
    { key: "consultants", title: "Consultants", icon: Users, total: consultantTotal, href: "/users?role=COUNSELOR", rows: consultants.map((c) => ({ id: c.id, title: fullName(c), subtitle: c.email, href: `/users/${c.id}`, tag: `${c._count.assignedStudents} students` })) },
    { key: "applications", title: "Applications", icon: FileText, total: applicationTotal, href: "/application", rows: applications.map((a) => ({ id: a.id, title: `${a.student.firstName} ${a.student.lastName} · ${a.program.name}`, subtitle: `ID ${a.id} · ${a.program.university.name} · Updated ${formatDate(a.updatedAt)}`, href: `/application/${a.id}`, tag: humanize(a.stage) })) },
  ];
  const visibleSections = sections.filter((section) => section.total > 0 || (type === section.key && q));
  const total = sections.reduce((sum, section) => sum + section.total, 0);

  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <header className="rounded-2xl bg-gradient-to-br from-navy-950 via-[#263b78] to-[#5b3aab] p-6 text-white shadow-sm sm:p-8"><p className="text-sm font-semibold text-blue-100">Find records across your workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Advanced search</h1><p className="mt-2 max-w-2xl text-base leading-7 text-blue-50">Search catalogs, students in your scope, consultants, and application records from one place.</p></header>
    <ResponsiveFilterPanel title="Advanced search filters" activeCount={[q, type !== "all" ? type : "", country, level, validStatus].filter(Boolean).length}>
    <form method="GET" role="search" aria-label="Search the portal" className="grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6 dark:border-navy-700 dark:bg-navy-900">
      <div className="sm:col-span-2 lg:col-span-3"><Label htmlFor="search-q">Keywords or record ID</Label><div className="relative mt-1"><SearchIcon aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="search-q" name="q" type="search" maxLength={160} defaultValue={q} placeholder="Name, email, program, university, or ID" className="pl-9" /></div></div>
      <div><Label htmlFor="search-type">Search in</Label><Select id="search-type" name="type" defaultValue={type} className="mt-1"><option value="all">Everything</option>{TYPES.slice(1).map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</Select></div>
      <div><Label htmlFor="search-country">Country</Label><Select id="search-country" name="country" defaultValue={country} className="mt-1"><option value="">All countries</option>{countries.map((item) => <option key={item}>{item}</option>)}</Select></div>
      <div><Label htmlFor="search-level">Study level</Label><Select id="search-level" name="level" defaultValue={level} className="mt-1"><option value="">All levels</option>{PROGRAM_LEVELS.map((item) => <option key={item} value={item}>{programLevelLabel(item)}</option>)}</Select></div>
      <div><Label htmlFor="search-status">Status / application stage</Label><Select id="search-status" name="status" defaultValue={status} className="mt-1"><option value="">Any status</option>{APPLICATION_STAGES.map((item) => <option key={item} value={item}>{humanize(item)}</option>)}{isSuperAdmin && <><option value="active">Published courses</option><option value="draft">Draft courses</option></>}</Select></div>
      <div className="flex items-end gap-2"><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"><SearchIcon aria-hidden className="h-4 w-4" />Search</button><Link href="/search" className="inline-flex min-h-11 items-center rounded-lg border border-line-strong px-3 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700">Reset</Link></div>
    </form>
    </ResponsiveFilterPanel>
    <p className="text-sm text-ink-muted" aria-live="polite">{total.toLocaleString()} matching record{total === 1 ? "" : "s"}{q || country || level || status ? " across the selected scope" : " available in your workspace"}. Results are limited to students and records you are authorized to access.</p>
    {visibleSections.length === 0 ? <Card><CardContent className="py-12 text-center"><p className="text-lg font-semibold">No matching records</p><p className="mt-1 text-sm text-ink-muted">Try fewer filters or a different keyword.</p></CardContent></Card> : <div className="space-y-5">{visibleSections.map((section) => { const Icon = section.icon; return <section key={section.key} aria-labelledby={`search-${section.key}`} className="rounded-2xl border border-line bg-white shadow-sm dark:border-navy-700 dark:bg-navy-900"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 dark:border-navy-700"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"><Icon aria-hidden className="h-5 w-5" /></span><div><h2 id={`search-${section.key}`} className="text-lg font-bold">{section.title}</h2><p className="text-sm text-ink-muted">{section.total} match{section.total === 1 ? "" : "es"}</p></div></div>{section.total > section.rows.length && <Link href={`${section.href}?q=${encodeURIComponent(q)}${country ? `&country=${encodeURIComponent(country)}` : ""}`} className="inline-flex min-h-9 items-center rounded-lg border border-line-strong px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:border-navy-700 dark:text-brand-300">View all {section.title.toLowerCase()}</Link>}</div><ul className="divide-y divide-line dark:divide-navy-700">{section.rows.map((row) => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 transition hover:bg-canvas-subtle dark:hover:bg-navy-800/50"><div className="min-w-0"><Link href={row.href} className="font-semibold text-ink hover:text-brand-700 hover:underline dark:hover:text-brand-300">{row.title}</Link><p className="mt-1 truncate text-sm text-ink-muted">{row.subtitle}</p></div><Badge tone="slate">{row.tag}</Badge></li>)}</ul>{section.total > section.rows.length && <p className="px-5 py-3 text-xs text-ink-muted">Showing {section.rows.length} of {section.total}. Use “View all” to open the full filtered list.</p>}</section>; })}</div>}
  </div>;
}
