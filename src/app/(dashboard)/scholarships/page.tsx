import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { listPrograms, listUniversities, profileCompleteness, type ProgramCard } from "@/lib/queries";
import { ProgramForm } from "@/components/program-form";
import { CurrencySwitcher, FeeDisplay } from "@/components/currency";
import { ShortlistToggle } from "@/components/shortlist-toggle";
import { ApplyButton } from "@/components/apply-button";
import { DeleteButton } from "@/components/delete-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Scholarships" };

function rowKeys(p: ProgramCard): string[] {
  const tagKeys: Record<string, string> = {
    "High Placement Rate": "green",
    "Scholarship Available": "brand",
    "MOI Accepted": "amber",
    "Popular with Partners": "slate",
  };
  return (p.tags ?? []).map((t) => tagKeys[t] ?? "slate");
}

export default async function ScholarshipsPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  const [programs, universities] = await Promise.all([listPrograms(), listUniversities()]);
  const isSuperAdmin = user.role === "SUPER_ADMIN";

  let profileReady = false;
  if (user.role === "STUDENT") {
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        phone: true, country: true, gender: true, birthday: true, passportNumber: true,
        countryOfResidence: true, nationality: true, cityOfResidence: true,
        address: true, motherName: true, fatherName: true,
      },
    });
    profileReady = Boolean(me && profileCompleteness(me as unknown as Parameters<typeof profileCompleteness>[0]) >= 80);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Scholarships</h1>
          <p className="text-sm text-slate-500">University and program catalog.</p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === "STUDENT" && <CurrencySwitcher />}
          {isSuperAdmin && <ProgramForm universities={universities} />}
        </div>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            No programs in the catalog yet.
            {isSuperAdmin && " Use “+ Add program” to create the first one."}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                    <th className="p-4">University / Program</th>
                    <th className="p-4">Level</th>
                    <th className="p-4">Field</th>
                    <th className="p-4">Tuition</th>
                    <th className="p-4">Next intake</th>
                    <th className="p-4">Tags</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {programs.map((p) => {
                    const nextIntake = p.intakeDates
                      .map((d) => new Date(d))
                      .filter((d) => d.getTime() > Date.now())
                      .sort((a, b) => a.getTime() - b.getTime())[0];
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                              {p.university?.name?.[0] ?? "?"}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium">{p.university?.name ?? "Unknown"}</p>
                              <p className="truncate text-xs text-slate-500">
                                {p.name} · {p.location ?? p.university?.country ?? ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge tone="slate">{p.level}</Badge>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">{p.field}</td>
                        <td className="p-4">
                          <FeeDisplay amount={p.tuitionFee} />
                          <div className="text-[11px] text-slate-400">
                            {p.visaRequired ? "Visa required" : "No visa"}
                          </div>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300">
                          {nextIntake ? formatDate(nextIntake) : "—"}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {p.tags.slice(0, 2).map((t, i) => (
                              <Badge key={t} tone={rowKeys(p)[i] as "green" | "brand" | "amber" | "slate"}>
                                {t}
                              </Badge>
                            ))}
                            {p.tags.length > 2 && <Badge tone="slate">+{p.tags.length - 2}</Badge>}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/scholarships/${p.slug ?? p.id}`}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
                            >
                              <ExternalLink className="h-3 w-3" /> View
                            </Link>
                            <a
                              href={`/api/programs/${p.id}/pdf`}
                              target="_blank"
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Download className="h-3 w-3" /> PDF
                            </a>
                            {user.role === "STUDENT" && <ShortlistToggle programId={p.id} />}
                            {user.role === "STUDENT" && <ApplyButton programId={p.id} profileReady={profileReady} />}
                            {isSuperAdmin && (
                              <>
                                <ProgramForm universities={universities} initial={{ id: p.id, universityId: p.university?.id ?? undefined, name: p.name, level: p.level, field: p.field, location: p.location ?? undefined, tuitionFee: String(p.tuitionFee), applicationFee: p.applicationFee != null ? String(p.applicationFee) : "", intakeDates: p.intakeDates, requiredDocuments: p.requiredDocuments, minGpa: p.minGpa, visaRequired: p.visaRequired, commissionRate: String(p.commissionRate), tags: p.tags, offerTurnaroundDays: p.offerTurnaroundDays, collegeRank: p.collegeRank ?? undefined, eligibilityCriteria: p.eligibilityCriteria, courseDurationMonths: p.courseDurationMonths ?? undefined }} />
                                <DeleteButton endpoint={`/api/scholarships/${p.id}`} confirmText="Delete this program?" label="Delete" />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}