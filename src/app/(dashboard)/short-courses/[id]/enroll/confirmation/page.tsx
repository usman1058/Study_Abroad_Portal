import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Clock3, CreditCard, FileCheck2, MailCheck, TriangleAlert } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { FeeDisplay } from "@/components/currency";
import { UploadReceipt } from "@/components/upload-receipt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { humanize, toNum } from "@/lib/utils";

export const metadata = { title: "Enrollment status" };

export default async function ShortCourseEnrollmentConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect(`/short-courses/${encodeURIComponent(id)}`);
  const enrollment = await prisma.shortCourseEnrollment.findUnique({
    where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } },
    include: { shortCourse: { select: { id: true, title: true, provider: true, fee: true, paymentType: true, bankDetails: true, duration: true, deliveryMode: true } } },
  });
  if (!enrollment) redirect(`/short-courses/${encodeURIComponent(id)}/enroll`);
  const course = enrollment.shortCourse;
  const paymentDue = enrollment.status === "pending_payment" || enrollment.status === "rejected";
  const approved = enrollment.status === "enrolled" || enrollment.status === "completed";

  return <main className="mx-auto max-w-4xl space-y-6 pb-10">
    <header className={`overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-9 ${approved ? "bg-gradient-to-br from-emerald-900 via-teal-800 to-indigo-800" : enrollment.status === "rejected" ? "bg-gradient-to-br from-rose-900 via-red-800 to-violet-800" : "bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700"}`}>
      <p className="text-xs font-bold uppercase tracking-[.18em] text-white/80">Enrollment status · {course.title}</p>
      <div className="mt-3 flex items-start gap-3">{approved ? <BadgeCheck className="mt-1 h-8 w-8 shrink-0" aria-hidden="true" /> : enrollment.status === "rejected" ? <TriangleAlert className="mt-1 h-8 w-8 shrink-0" aria-hidden="true" /> : <MailCheck className="mt-1 h-8 w-8 shrink-0" aria-hidden="true" />}<div><h1 className="text-3xl font-extrabold sm:text-4xl">{approved ? "Your place is approved" : enrollment.status === "pending_approval" ? "Your receipt is being reviewed" : enrollment.status === "rejected" ? "Your receipt needs an update" : "Your request was received"}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/90 sm:text-base">{approved ? "You can now open the course classroom. We have also sent an approval update to your account email." : enrollment.status === "pending_approval" ? "Your payment receipt reached our team. We’ll email you after the review is complete." : enrollment.status === "rejected" ? "Review the payment instructions and upload a corrected receipt to return it to the review queue." : "Your enrollment request is saved. Complete the payment step below so staff can review and confirm your place."}</p></div></div>
      <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-white/85"><span className="rounded-full bg-white/15 px-3 py-1.5">Reference: {enrollment.id}</span><span className="rounded-full bg-white/15 px-3 py-1.5">{humanize(enrollment.status)}</span></div>
    </header>

    {paymentDue && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="detail-panel border-line-strong bg-white shadow-sm dark:border-navy-700 dark:bg-navy-900">
        <CardHeader><p className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Payment step</p><CardTitle className="flex items-center gap-2 text-xl"><CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-300" aria-hidden="true" />Transfer and submit your receipt</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-100/80 to-violet-100/70 p-4 dark:border-indigo-900/60 dark:from-indigo-950/60 dark:to-violet-950/45"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">Course fee</p><p className="text-lg font-extrabold text-indigo-800 dark:text-indigo-200"><FeeDisplay amount={toNum(course.fee)} /></p></div><p className="mt-1 text-sm text-ink-muted">{course.provider} · {course.duration} · {humanize(course.deliveryMode)}</p></div>
          <div><h2 className="font-bold">Bank transfer details</h2>{course.bankDetails ? <p className="mt-2 whitespace-pre-line rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 text-sm leading-6 dark:border-violet-900/50 dark:from-violet-950/30 dark:to-indigo-950/30">{course.bankDetails}</p> : <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">Bank instructions are not available for this course yet. Please contact the admin from Messages before sending payment.</p>}</div>
          <div className="rounded-2xl border border-indigo-100 bg-white/70 p-4 dark:border-indigo-900/60 dark:bg-navy-900/60"><div className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-300" aria-hidden="true" /><p className="text-sm leading-6 text-ink-muted">After uploading, your receipt is marked <strong>Under review</strong>. The classroom stays locked until staff approves it. You’ll receive an email with the decision.</p></div></div>
          <div className="border-t border-indigo-100 pt-4 dark:border-indigo-900/60"><h2 className="mb-3 font-bold">{enrollment.status === "rejected" ? "Upload a corrected receipt" : "Upload your transfer receipt"}</h2><UploadReceipt shortCourseId={id} /></div>
        </CardContent>
      </Card>
      <Card className="detail-panel h-fit border-line-strong bg-white shadow-sm dark:border-navy-700 dark:bg-navy-900"><CardHeader><CardTitle className="text-lg">What happens next?</CardTitle></CardHeader><CardContent><ol className="space-y-4 text-sm"><li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100">1</span><span><strong>Send the course fee</strong><span className="mt-1 block text-ink-muted">Use the bank details shown here.</span></span></li><li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-100">2</span><span><strong>Upload your receipt</strong><span className="mt-1 block text-ink-muted">We’ll notify you when it reaches review.</span></span></li><li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100">3</span><span><strong>Get the decision by email</strong><span className="mt-1 block text-ink-muted">Approved enrollments get classroom access.</span></span></li></ol></CardContent></Card>
    </div>}

    {enrollment.status === "pending_approval" && <Card className="detail-panel border-amber-300 bg-white shadow-sm dark:border-amber-900/70 dark:bg-navy-900"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7"><div><h2 className="text-lg font-bold">Your receipt is in the review queue</h2><p className="mt-1 text-sm leading-6 text-ink-muted">There’s nothing else to submit right now. We’ll send the approval or follow-up email to <strong>{user.email}</strong>.</p></div><a href={`/api/short-courses/${encodeURIComponent(id)}/receipt`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"><FileCheck2 className="h-4 w-4" aria-hidden="true" /> View receipt</a></CardContent></Card>}

    {approved && <Card className="detail-panel border-emerald-300 bg-white shadow-sm dark:border-emerald-900/70 dark:bg-navy-900"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-7"><div><h2 className="text-lg font-bold">Enrollment approved</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Your schedule, class links, and course materials are ready.</p></div><Link href={`/short-courses/${encodeURIComponent(id)}/classroom`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white">Enter classroom <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link></CardContent></Card>}

    <div className="flex flex-wrap gap-3"><Link href={`/short-courses/${encodeURIComponent(id)}`} className="inline-flex min-h-10 items-center rounded-xl border border-line-strong bg-white px-4 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:bg-navy-900">Course overview</Link>{approved && <Link href={`/short-courses/${encodeURIComponent(id)}/classroom/sessions`} className="inline-flex min-h-10 items-center rounded-xl border border-line-strong bg-white px-4 text-sm font-semibold hover:bg-canvas-subtle dark:border-navy-700 dark:bg-navy-900">View class schedule</Link>}</div>
  </main>;
}
