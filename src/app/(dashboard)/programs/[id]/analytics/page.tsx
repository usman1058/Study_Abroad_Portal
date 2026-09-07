import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProgramAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) redirect("/");
  const { id } = await params;
  const program = await prisma.program.findUnique({
    where: { id },
    include: {
      university: true,
      applications: { select: { stage: true, createdAt: true, student: { select: { id: true, firstName: true, lastName: true } } } },
      programViews: { select: { viewedAt: true } },
    },
  });
  if (!program) return <Card><CardContent className="p-8 text-center">Program not found.</CardContent></Card>;
  const stages = program.applications.reduce<Record<string, number>>((a, x) => { a[x.stage] = (a[x.stage] ?? 0) + 1; return a; }, {});
  return <div className="space-y-6"><div><p className="text-sm text-brand-600">{program.university.name}</p><h1 className="text-2xl font-bold">{program.name} analytics</h1><p className="text-sm text-slate-500">Usage, application, and student breakdown for this program.</p></div><div className="grid gap-4 sm:grid-cols-3"><Metric label="Applications" value={program.applications.length}/><Metric label="Program views" value={program.programViews.length}/><Metric label="Conversion" value={`${program.programViews.length ? Math.round(program.applications.length / program.programViews.length * 100) : 0}%`}/></div><Card><CardHeader><CardTitle>Application stages</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-3">{Object.entries(stages).map(([stage, count]) => <div key={stage} className="rounded-lg border border-slate-200 px-4 py-3 dark:border-slate-700"><Badge tone="brand">{stage.replace(/_/g, " ")}</Badge><p className="mt-2 text-2xl font-bold">{count}</p></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Students using this program</CardTitle></CardHeader><CardContent><ul className="divide-y divide-slate-100 dark:divide-slate-800">{program.applications.map((a) => <li key={`${a.student.id}-${a.createdAt.toISOString()}`} className="flex justify-between py-3 text-sm"><span>{a.student.firstName} {a.student.lastName}</span><Badge tone="slate">{a.stage.replace(/_/g, " ")}</Badge></li>)}</ul></CardContent></Card></div>;
}
function Metric({ label, value }: { label: string; value: string | number }) { return <Card><CardContent className="p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></CardContent></Card>; }
