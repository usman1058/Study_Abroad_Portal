import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BadgeCheck, BookOpenCheck, CircleUserRound, CreditCard, Mail, ShieldCheck } from "lucide-react";
import { currentUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { FeeDisplay } from "@/components/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShortCourseEnrollmentSubmit } from "@/components/short-course-enrollment-submit";
import { humanize, toNum } from "@/lib/utils";

export const metadata = { title: "Enroll in a short course" };

export default async function ShortCourseEnrollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/");
  if (user.role !== "STUDENT") redirect(`/short-courses/${encodeURIComponent(id)}`);

  const [course, student, existing] = await Promise.all([
    prisma.shortCourse.findUnique({ where: { id }, select: { id: true, title: true, provider: true, fee: true, paymentType: true, status: true, duration: true, deliveryMode: true, startDates: true, bankDetails: true } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { firstName: true, lastName: true, email: true, phone: true, country: true } }),
    prisma.shortCourseEnrollment.findUnique({ where: { studentId_shortCourseId: { studentId: user.id, shortCourseId: id } }, select: { id: true } }),
  ]);
  if (!course || course.status !== "active") notFound();
  if (existing) redirect(`/short-courses/${encodeURIComponent(id)}/enroll/confirmation`);
  if (!student) redirect("/");

  const paid = course.paymentType !== "FREE";
  const fullName = `${student.firstName} ${student.lastName}`.trim();

  return <main className="mx-auto max-w-5xl space-y-6 pb-10">
    <Link href={`/short-courses/${encodeURIComponent(id)}`} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to course</Link>
    <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-800 to-violet-700 p-6 text-white shadow-lg sm:p-9">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-100">Enrollment · {humanize(course.paymentType)}</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Your next learning step</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-50 sm:text-base">Review how enrollment works, check the details attached to your student profile, then submit your request. We’ll email you as it moves through review.</p>
    </header>

    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card className="detail-panel border-line-strong bg-white shadow-sm dark:border-navy-700 dark:bg-navy-900">
          <CardHeader><p className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Before you submit</p><CardTitle className="text-xl">Enrollment steps</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[{ icon: CircleUserRound, title: "Confirm your student details", copy: "We use the name, email, and phone number in your CheckMyUni profile." }, ...(paid ? [{ icon: CreditCard, title: "Review payment instructions", copy: "After submitting, this page will show the course bank details and receipt upload." }] : []), { icon: BadgeCheck, title: paid ? "Wait for receipt review" : "Access your classroom", copy: paid ? "Our team reviews your receipt and emails you when your place is approved." : "Your free course enrollment is confirmed and the classroom opens right away." }, { icon: BookOpenCheck, title: "Follow your course", copy: "Your schedule, meeting links, and published materials are available in the classroom." }].map(({ icon: Icon, title, copy }, index) => <div key={title} className="flex gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-4 dark:border-indigo-900/60 dark:from-indigo-950/45 dark:to-violet-950/40"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 dark:from-indigo-900/60 dark:to-violet-900/50 dark:text-indigo-200"><Icon className="h-5 w-5" aria-hidden="true" /></span><div><p className="font-bold"><span className="mr-2 text-xs text-indigo-600 dark:text-indigo-300">0{index + 1}</span>{title}</p><p className="mt-1 text-sm leading-6 text-ink-muted">{copy}</p></div></div>)}
          </CardContent>
        </Card>
        <Card className="detail-panel border-line-strong bg-white shadow-sm dark:border-navy-700 dark:bg-navy-900">
          <CardHeader><p className="text-xs font-bold uppercase tracking-wide text-violet-700 dark:text-violet-300">Student information</p><CardTitle className="text-xl">Details on your account</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {[{ label: "Full name", value: fullName, icon: CircleUserRound }, { label: "Email", value: student.email, icon: Mail }, { label: "Phone", value: student.phone || "Not added", icon: null }, { label: "Country", value: student.country || "Not added", icon: null }].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 dark:border-violet-900/60 dark:from-violet-950/45 dark:to-indigo-950/40"><p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p><p className="mt-1 flex items-center gap-2 break-words font-semibold">{Icon && <Icon className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden="true" />}{value}</p></div>)}
            <p className="sm:col-span-2 text-xs leading-5 text-ink-muted">Need to correct these details? Update your profile before enrolling so our team can contact you reliably.</p>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="detail-panel border-indigo-200 bg-gradient-to-br from-indigo-50/90 to-violet-50/80 dark:border-indigo-900/60 dark:from-indigo-950/45 dark:to-violet-950/40">
          <CardHeader><p className="text-xs font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Course summary</p><CardTitle className="text-lg">{course.title}</CardTitle><p className="text-sm text-ink-muted">{course.provider}</p></CardHeader>
          <CardContent className="space-y-3 text-sm"><div className="flex justify-between gap-3"><span className="text-ink-muted">Fee</span><strong>{paid ? <FeeDisplay amount={toNum(course.fee)} /> : "Free"}</strong></div><div className="flex justify-between gap-3"><span className="text-ink-muted">Duration</span><strong>{course.duration}</strong></div><div className="flex justify-between gap-3"><span className="text-ink-muted">Delivery</span><strong>{humanize(course.deliveryMode)}</strong></div><p className="border-t border-indigo-100 pt-3 text-xs leading-5 text-ink-muted dark:border-indigo-900/60">{paid ? "Your request is not complete until you upload a receipt. Your place is confirmed after review." : "Submitting confirms your free enrollment and gives you access to the classroom."}</p><ShortCourseEnrollmentSubmit courseId={id} paid={paid} /></CardContent>
        </Card>
        <p className="px-2 text-center text-xs leading-5 text-ink-muted"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />Your request and payment receipt are visible only to you and authorized staff.</p>
      </aside>
    </div>
  </main>;
}
