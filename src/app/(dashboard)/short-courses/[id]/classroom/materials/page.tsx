import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getShortCourse } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";
import { ShortCourseStudio, type ShortCourseMaterialInfo } from "@/components/short-course-studio";
import { ShortCourseWorkspaceNav, CourseSectionHeader, EmptyClassroom } from "@/components/short-course-workspace-nav";

export const metadata = { title: "Learning materials" };

function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }

export default async function ShortCourseMaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");
  const course = await getShortCourse(id);
  if (!course) notFound();
  const isAdmin = user.role === "SUPER_ADMIN";
  const enrollment = user.role === "STUDENT" ? await prisma.shortCourseEnrollment.findUnique({ where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } }, select: { status: true } }) : null;
  if (course.status !== "active" && !isAdmin && !enrollment) notFound();
  if (!isAdmin && user.role !== "STUDENT") redirect(`/short-courses/${id}`);
  const hasClassAccess = enrollment?.status === "enrolled" || enrollment?.status === "completed";
  const rows = isAdmin || hasClassAccess ? await prisma.shortCourseMaterial.findMany({
    where: { shortCourseId: id, ...(isAdmin ? {} : { published: true }) }, orderBy: [{ createdAt: "desc" }],
    select: { id: true, title: true, description: true, fileName: true, contentType: true, fileSize: true, published: true, createdAt: true },
  }) : [];
  const materials: ShortCourseMaterialInfo[] = rows.map((material) => ({ ...material, createdAt: material.createdAt.toISOString() }));
  return <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6">
    <CourseSectionHeader eyebrow="Classroom · Resources" title={`${course.title} materials`} description="Course resources are kept in one focused library. Enrolled students can download published materials; drafts remain visible to administrators only." />
    <ShortCourseWorkspaceNav courseId={id} active="materials" isAdmin={isAdmin} />
    {isAdmin ? <ShortCourseStudio courseId={id} sessions={[]} materials={materials} view="materials" /> : hasClassAccess ? <Card className="border-line/80 shadow-sm dark:border-navy-700"><CardHeader><CardTitle>Published learning materials</CardTitle><p className="text-sm text-ink-muted">Download the files shared by your course team.</p></CardHeader><CardContent>{materials.length ? <ul className="grid gap-3 md:grid-cols-2">{materials.map((material) => <li key={material.id} className="flex min-w-0 items-start gap-3 rounded-2xl border border-line p-4 dark:border-navy-700"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"><FileText className="h-5 w-5" aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{material.title}</h2><Badge tone="green">Published</Badge></div><p className="mt-1 truncate text-xs text-ink-muted">{material.fileName} · {formatBytes(material.fileSize)}</p>{material.description && <p className="mt-2 text-sm leading-6 text-ink-muted">{material.description}</p>}<a href={`/api/short-courses/${id}/materials/${material.id}`} aria-label={`Download ${material.title}`} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-line-strong px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:border-navy-700 dark:text-brand-300 dark:hover:bg-brand-900/30"><Download className="h-4 w-4" aria-hidden="true" />Download</a></div></li>)}</ul> : <EmptyClassroom title="Your learning library is ready" description="Your course team has not published study files yet. New resources will appear here." />}</CardContent></Card> : <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Course materials unlock after your enrollment is confirmed. Return to the <a href={`/short-courses/${id}`} className="font-semibold underline">course overview</a> to see your enrollment status.</div>}
  </div>;
}
