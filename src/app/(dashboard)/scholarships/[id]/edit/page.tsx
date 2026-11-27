import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ScholarshipForm } from "@/components/scholarship-form";

export const metadata = { title: "Edit scholarship" };

export default async function EditScholarshipPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "SUPER_ADMIN") redirect("/scholarships");
  const { id } = await params;
  const [scholarship, universities, programs] = await Promise.all([
    prisma.scholarship.findUnique({ where: { id }, include: { universities: true, programs: true } }),
    prisma.university.findMany({ orderBy: [{ country: "asc" }, { name: "asc" }], select: { id: true, name: true, country: true } }),
    prisma.program.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, level: true, field: true, universityId: true, university: { select: { name: true } } } }),
  ]);
  if (!scholarship) notFound();
  const programOptions = programs.map((program) => ({ id: program.id, name: program.name, level: program.level, field: program.field, universityId: program.universityId, universityName: program.university.name }));
  const initial = {
    id: scholarship.id, name: scholarship.name, providerName: scholarship.providerName, description: scholarship.description,
    category: scholarship.category, awardType: scholarship.awardType, awardValue: scholarship.awardValue?.toString() ?? null,
    awardCurrency: scholarship.awardCurrency, eligibleCountries: scholarship.eligibleCountries, studyLevels: scholarship.studyLevels,
    subject: scholarship.subject, eligibilityCriteria: scholarship.eligibilityCriteria, deadline: scholarship.deadline?.toISOString() ?? null,
    applicationUrl: scholarship.applicationUrl, isActive: scholarship.isActive,
    universityIds: scholarship.universities.map((item) => item.universityId), programIds: scholarship.programs.map((item) => item.programId),
  };
  return <div className="mx-auto max-w-5xl space-y-6 pb-8"><Link href={`/scholarships/${scholarship.slug}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"><ArrowLeft aria-hidden className="h-4 w-4" /> Back to scholarship</Link><header><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Catalog management</p><h1 className="mt-1 text-3xl font-bold">Edit scholarship</h1><p className="mt-2 text-base leading-7 text-ink-muted">Update award terms, eligibility, universities, or programs.</p></header><ScholarshipForm universities={universities} programs={programOptions} initial={initial} /></div>;
}
