import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ProgramForm } from "@/components/program-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Add program" };

export default async function NewProgramPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "SUPER_ADMIN") redirect("/programs");
  const universities = await prisma.university.findMany({ orderBy: [{ country: "asc" }, { name: "asc" }], select: { id: true, name: true, country: true } });
  return <div className="mx-auto max-w-4xl space-y-6 pb-8">
    <Link href="/programs" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm font-semibold text-brand-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:text-brand-300"><ArrowLeft aria-hidden className="h-4 w-4" /> Back to programs</Link>
    <header><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Catalog management</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Add a program</h1><p className="mt-2 max-w-2xl text-base leading-7 text-ink-muted">Choose a university already in your catalog, then add the course and its requirements. New universities can be added from the Universities page.</p></header>
    {universities.length === 0 && <Card><CardContent className="border-l-4 border-amber-500 py-4 text-sm">Add a university before creating a program. <Link href="/universities" className="font-semibold text-brand-700 underline dark:text-brand-300">Open Universities</Link></CardContent></Card>}
    <ProgramForm universities={universities} startOpen standalone />
  </div>;
}
