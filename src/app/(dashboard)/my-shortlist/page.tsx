import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, MessageCircle, ExternalLink } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { CompareCourses } from "@/components/compare-courses";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "My Shortlist" };

const TAG_TONE: Record<string, "green" | "brand" | "amber" | "slate"> = {
  "High Placement Rate": "green",
  "Scholarship Available": "brand",
  "MOI Accepted": "amber",
  "Popular with Partners": "slate",
};

export default async function MyShortlistPage() {
  const user = await currentUser();
  if (!user) redirect("/");

  if (user.role !== "STUDENT") redirect("/home");

  const shortlist = await prisma.shortlist.findUnique({
    where: { studentId: user.id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { program: { include: { university: true } } },
      },
    },
  });

  // Last-viewed tracking, §6
  if (shortlist) {
    prisma.shortlistView.create({ data: { shortlistId: shortlist.id, studentId: user.id } }).catch(() => {});
  }

  const items = shortlist?.items ?? [];
  const shareUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/my-shortlist`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My Shortlist</h1>
          <p className="text-sm text-slate-500">Handpicked courses recommended for you.</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/shortlist/${user.id}/pdf`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <Download className="h-4 w-4" /> Download Full Shortlist PDF
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`My handpicked study abroad shortlist — ${shareUrl}`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          >
            <MessageCircle className="h-4 w-4" /> Share on WhatsApp
          </a>
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Your shortlist is empty. Browse the <Link href="/scholarships" className="text-brand-600 hover:underline">scholarship catalog</Link> and add courses.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Compare courses</CardTitle>
            </CardHeader>
            <CardContent>
              <CompareCourses
                items={items.map((it) => ({
                  id: it.programId,
                  name: it.program.name,
                  university: it.program.university?.name ?? "Unknown",
                  tuition: Number(it.program.tuitionFee),
                  applicationFee: it.program.applicationFee != null ? Number(it.program.applicationFee) : null,
                  durationMonths: it.program.courseDurationMonths,
                  intakeDates: it.program.intakeDates.map((d) => d.toISOString()),
                  minGpa: it.program.minGpa,
                  tags: it.program.tags,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your courses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                      <th className="p-4">#</th>
                      <th className="p-4">University</th>
                      <th className="p-4">Course / Program</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Tags</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((it, idx) => {
                      const p = it.program;
                      return (
                        <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="p-4 text-slate-400">{idx + 1}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                                {p.university?.name?.[0] ?? "?"}
                              </span>
                              <Link href={`/scholarships/${p.slug ?? p.id}`} className="font-medium hover:underline">
                                {p.university?.name ?? "Unknown"}
                              </Link>
                            </div>
                          </td>
                          <td className="p-4">{p.name}</td>
                          <td className="p-4 text-slate-500">{p.location ?? p.university?.country ?? "—"}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {p.tags.slice(0, 3).map((t) => (
                                <Badge key={t} tone={TAG_TONE[t] ?? "slate"}>{t}</Badge>
                              ))}
                              {p.tags.length > 3 && <Badge tone="slate">+{p.tags.length - 3}</Badge>}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <Link
                              href={`/scholarships/${p.slug ?? p.id}`}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-900/40"
                            >
                              <ExternalLink className="h-3 w-3" /> View Details
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {shortlist && (
            <p className="text-xs text-slate-500">
              Last updated {formatDate(shortlist.updatedAt)} · {items.length} course{items.length > 1 ? "s" : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
}