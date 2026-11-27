import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ScholarshipForm } from "@/components/scholarship-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Add scholarship" };

export default async function NewScholarshipPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "SUPER_ADMIN") redirect("/scholarships");
  const [universities, programs] = await Promise.all([
    prisma.university.findMany({ orderBy: [{ country: "asc" }, { name: "asc" }], select: { id: true, name: true, country: true } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, level: true, field: true, universityId: true, university: { select: { name: true } } } }),
  ]);
  const programOptions = programs.map((program) => ({ id: program.id, name: program.name, level: program.level, field: program.field, universityId: program.universityId, universityName: program.university.name }));
  return <div className="mx-auto max-w-5xl space-y-6 pb-8"><Link href="/scholarships" className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"><ArrowLeft aria-hidden className="h-4 w-4" /> Back to scholarships</Link><header><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Catalog management</p><h1 className="mt-1 text-3xl font-bold">Add a scholarship</h1><p className="mt-2 max-w-2xl text-base leading-7 text-ink-muted">Create an award separately from course programs. Link it to one or more universities and optionally limit it to specific programs.</p></header>{!universities.length && <Card><CardContent className="border-l-4 border-amber-500 py-4 text-sm">Add universities before creating a linked scholarship. <Link href="/universities" className="font-semibold text-brand-700 underline dark:text-brand-300">Open Universities</Link></CardContent></Card>}<ScholarshipForm universities={universities} programs={programOptions} /></div>;
}
