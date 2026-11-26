import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getWorkingCountries } from "@/lib/working-countries";
import { UniversityManager } from "@/components/university-manager";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Universities" };

export default async function UniversitiesPage() {
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "SUPER_ADMIN") redirect("/programs");
  const [universities, countries] = await Promise.all([
    prisma.university.findMany({ orderBy: [{ country: "asc" }, { name: "asc" }], include: { _count: { select: { programs: true } } } }),
    getWorkingCountries(),
  ]);
  return <div className="space-y-6">
    <div><p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Catalog management</p><h1 className="mt-1 text-2xl font-bold">Universities</h1><p className="mt-2 max-w-2xl text-sm text-ink-muted">Add universities with a country from your approved destinations. Programs can then be linked to these saved university records.</p></div>
    {countries.length === 0 && <Card><CardContent className="border-l-4 border-amber-500 py-4 text-sm">No working countries are configured. Add them in <a href="/settings" className="font-semibold text-brand-700 underline dark:text-brand-300">Settings</a> before adding universities.</CardContent></Card>}
    <UniversityManager universities={universities} countries={countries} />
  </div>;
}
